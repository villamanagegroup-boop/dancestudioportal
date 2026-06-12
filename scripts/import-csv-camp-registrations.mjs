// One-off importer for the website camp-registration CSV export
// (camp_registrations_rows.csv). Each CSV row = one parent + one or more campers
// registered for one or more camp weeks. Produces a camp_registration per
// (camper, week), matching/creating the student and linking to the parent's
// existing family.
//
// Week -> camp resolution: prefer the camp NAME after ' · ' in the week label;
// fall back to the "Week N" number mapped to the Nth camp by start_date.
//
// Parents NOT already in the portal are reported and SKIPPED unless you pass
// --create-families (then a real auth user + profile is created for them).
//
// DRY RUN by default. Pass --commit to write.
//   node scripts/import-csv-camp-registrations.mjs "C:/Users/hicks/Downloads/camp_registrations_rows.csv"
//   node scripts/import-csv-camp-registrations.mjs <csv> --commit [--create-families]
//
// Idempotent: student matched by (first,last); registration keyed on
// unique(camp_id, student_id) — a re-run won't duplicate.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const args = process.argv.slice(2)
const COMMIT = args.includes('--commit')
const CREATE_FAMILIES = args.includes('--create-families')
const csvPath = args.find(a => !a.startsWith('--')) || 'C:/Users/hicks/Downloads/camp_registrations_rows.csv'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const norm = (s) => (s ?? '').trim().toLowerCase()
const splitName = (full) => {
  const parts = (full ?? '').trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') || '' }
}

// --- minimal RFC4180 CSV parser (handles quotes, "" escapes, embedded commas/newlines) ---
function parseCsv(text) {
  const rows = []; let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Extract the camp name from a week label: text after the LAST ' · ', before ' — '.
function campNameFromLabel(label) {
  if (!label) return ''
  const afterDot = label.includes('·') ? label.split('·').pop() : label
  return afterDot.split('—')[0].trim() // em dash separates the name from "Full week …"
}
function weekNumFromLabel(label) { const m = (label || '').match(/Week\s+(\d+)/i); return m ? Number(m[1]) : null }
function priceFromText(t) { const m = (t || '').match(/\$\s*(\d+(?:\.\d+)?)/g); return m ? Number(m[m.length - 1].replace(/[^\d.]/g, '')) : 0 }

const raw = parseCsv(readFileSync(csvPath, 'utf8'))
const header = raw[0].map(h => h.trim())
const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const records = raw.slice(1).filter(r => r.length > 1 && r[idx.id])

// --- preload portal state ---
const { data: camps } = await supabase.from('camps').select('id, name, start_date, price').order('start_date')
const campByName = new Map(camps.map(c => [norm(c.name), c]))
const campByWeekNum = new Map(camps.map((c, i) => [i + 1, c])) // ordered by start_date
const { data: profiles } = await supabase.from('profiles').select('id, email')
const profileByEmail = new Map(profiles.map(p => [norm(p.email), p.id]))
const { data: students } = await supabase.from('students').select('id, first_name, last_name')
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))
const { data: gLinks } = await supabase.from('guardian_students').select('guardian_id, student_id')
const linkSet = new Set(gLinks.map(l => `${l.guardian_id}|${l.student_id}`))
const { data: existingRegs } = await supabase.from('camp_registrations').select('camp_id, student_id')
const regSet = new Set(existingRegs.map(r => `${r.camp_id}|${r.student_id}`))

// Build a normalized [{ camperName, dob, age, gender, weeks:[{label, price}] }] per record.
function camperWeeksFromRecord(rec) {
  const out = []
  let campers = []
  try { campers = JSON.parse(rec[idx.campers] || '[]') } catch { campers = [] }

  if (Array.isArray(campers) && campers.length) {
    for (const c of campers) {
      const weeks = (c.weekItems || []).map(w => ({ label: w.weekLabel, price: Number(w.price) || 0 }))
      out.push({ camperName: c.name, dob: c.birthdate || null, age: c.age || null, gender: c.gender || null, weeks })
    }
    return out
  }

  // Fallback: single camper from the flat columns + the camp_weeks string.
  const segs = (rec[idx.camp_weeks] || '').split('|').map(s => s.trim()).filter(Boolean)
  const weeks = segs.map(s => ({ label: s, price: priceFromText(s) }))
  out.push({
    camperName: rec[idx.camper_name],
    dob: rec[idx.camper_birthdate] || null,
    age: rec[idx.camper_age] || null,
    gender: rec[idx.camper_gender] || null,
    weeks,
  })
  return out
}

let studentsCreated = 0, familiesCreated = 0, linksAdded = 0, regsCreated = 0
const problems = [], newFamilies = new Set()

for (const rec of records) {
  const email = norm(rec[idx.email])
  const parentName = rec[idx.parent_name]
  const depositPaid = norm(rec[idx.deposit_paid]) === 'true'
  const paidInFull = norm(rec[idx.paid_in_full]) === 'true'
  const depositAmount = Number(rec[idx.deposit_amount]) || 0
  const paypalId = rec[idx.paypal_order_id] || null
  const promo = rec[idx.promo_code] || null
  // The deposit (or full payment) is for the WHOLE order — spend it down across
  // the order's weeks so two weeks don't each claim the same $50.
  let depositLeft = paidInFull ? Number.POSITIVE_INFINITY : (depositPaid ? depositAmount : 0)

  console.log(`\n• ${parentName} <${email}>`)

  let guardianId = profileByEmail.get(email)
  if (!guardianId) {
    if (CREATE_FAMILIES && COMMIT) {
      const { first, last } = splitName(parentName)
      // Strong throwaway password (CSPRNG). The parent never uses it — they set
      // their own via "Forgot password" / a portal invite.
      const { data: au, error: aErr } = await supabase.auth.admin.createUser({
        email, email_confirm: true,
        password: randomBytes(24).toString('base64url') + 'A1!',
        user_metadata: { first_name: first, last_name: last, role: 'parent' },
      })
      if (aErr) { problems.push(`create family ${email}: ${aErr.message}`); continue }
      guardianId = au.user.id
      await supabase.from('profiles').upsert({ id: guardianId, email, first_name: first, last_name: last, phone: rec[idx.phone] || null, role: 'parent' }, { onConflict: 'id' })
      profileByEmail.set(email, guardianId); familiesCreated++
      console.log(`  + NEW FAMILY created for ${email}`)
    } else {
      newFamilies.add(email)
      console.log(`  ! no portal family for ${email} — ${CREATE_FAMILIES ? '(would create)' : 'SKIPPED (use --create-families)'}`)
      if (!CREATE_FAMILIES) continue
      guardianId = `(new:${email})`
    }
  }

  for (const camper of camperWeeksFromRecord(rec)) {
    const { first, last } = splitName(camper.camperName)
    if (!first) { problems.push(`camper with no name (${email})`); continue }
    const nameKey = `${norm(first)}|${norm(last)}`

    let studentId = studentByName.get(nameKey)
    if (!studentId) {
      if (COMMIT && !String(guardianId).startsWith('(new:')) {
        const { data: ins, error } = await supabase.from('students')
          .insert({ first_name: first, last_name: last, date_of_birth: camper.dob || null, gender: camper.gender || null })
          .select('id').single()
        if (error) { problems.push(`create student ${first} ${last}: ${error.message}`); continue }
        studentId = ins.id
      } else studentId = `(new:${nameKey})`
      studentByName.set(nameKey, studentId); studentsCreated++
      console.log(`  + student ${first} ${last}${camper.dob ? ` (dob ${camper.dob})` : ''}`)
    } else console.log(`  = student ${first} ${last} (exists)`)

    const linkKey = `${guardianId}|${studentId}`
    if (!linkSet.has(linkKey)) {
      if (COMMIT && !String(studentId).startsWith('(new:') && !String(guardianId).startsWith('(new:')) {
        await supabase.from('guardian_students').insert({ guardian_id: guardianId, student_id: studentId, relationship: 'parent', is_primary: true })
      }
      linkSet.add(linkKey); linksAdded++
    }

    for (const wk of camper.weeks) {
      let camp = campByName.get(norm(campNameFromLabel(wk.label)))
      if (!camp) { const n = weekNumFromLabel(wk.label); if (n) camp = campByWeekNum.get(n) }
      if (!camp) { problems.push(`no camp matched "${wk.label}" for ${first} ${last}`); continue }

      const pairKey = `${camp.id}|${studentId}`
      if (regSet.has(pairKey)) { console.log(`    = ${camp.name} (already registered)`); continue }

      const price = wk.price || Number(camp.price) || 0
      let amountPaid = 0, payment_status = 'unpaid'
      if (depositLeft > 0) {
        amountPaid = Math.min(depositLeft, price)
        depositLeft -= amountPaid
        payment_status = amountPaid >= price ? 'paid' : 'deposit'
      }
      const reg = {
        camp_id: camp.id, student_id: studentId, guardian_id: guardianId,
        status: 'registered', payment_status, amount_paid: amountPaid,
        notes: `Website CSV import · ${wk.label} · est $${price.toFixed(2)}${paypalId ? ` · PayPal ${paypalId}` : ''}${promo ? ` · promo ${promo}` : ''}`,
      }
      if (COMMIT && !String(studentId).startsWith('(new:') && !String(guardianId).startsWith('(new:')) {
        const { error } = await supabase.from('camp_registrations').insert(reg)
        if (error) { problems.push(`reg ${first} ${last} -> ${camp.name}: ${error.message}`); continue }
      }
      regSet.add(pairKey); regsCreated++
      console.log(`    + ${camp.name.padEnd(28)} ${payment_status.padEnd(8)} paid $${amountPaid.toFixed(2)}`)
    }
  }
}

console.log(`\n=== CSV CAMP IMPORT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`records: ${records.length} | families created: ${familiesCreated} | students: ${studentsCreated} | links: ${linksAdded} | registrations: ${regsCreated}`)
if (newFamilies.size) { console.log(`\nPARENTS NOT IN PORTAL (${newFamilies.size}):`); for (const e of newFamilies) console.log('  - ' + e) }
if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log('  - ' + p) }
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit (add --create-families to create missing parents).')
console.log('')
