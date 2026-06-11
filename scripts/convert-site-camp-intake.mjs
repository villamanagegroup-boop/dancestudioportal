// Convert pending website camp registrations (site_intake, source_form='camp',
// status='new') into real portal records: a student per camper (linked to the
// submitter's existing family) + a camp_registration per (camper, week), then
// mark the intake row 'matched'.
//
// Week -> camp is resolved from each weekItem's label suffix after ' · '
// (e.g. "Week 6: July 20 – July 24 · Movie Magic Dance Camp" -> "Movie Magic
// Dance Camp"), matched case-insensitively against camps.name.
//
// Payment: site deposits are pay-later (PayPal handled separately), so unless
// the payload says paid_in_full / deposit_paid, amount_paid=0 and status=unpaid.
//
// DRY RUN by default. Pass --commit to write. Idempotent: student matched by
// (first,last); registration keyed on unique(camp_id, student_id); intake row
// only advanced from 'new'.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const COMMIT = process.argv.includes('--commit')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const norm = (s) => (s ?? '').trim().toLowerCase()
const splitName = (full) => {
  const parts = (full ?? '').trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') || '' }
}

const { data: camps } = await supabase.from('camps').select('id, name')
const campByName = new Map(camps.map(c => [norm(c.name), c]))

const { data: profiles } = await supabase.from('profiles').select('id, email')
const profileByEmail = new Map(profiles.map(p => [norm(p.email), p.id]))

const { data: students } = await supabase.from('students').select('id, first_name, last_name')
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))

const { data: gLinks } = await supabase.from('guardian_students').select('guardian_id, student_id')
const linkSet = new Set(gLinks.map(l => `${l.guardian_id}|${l.student_id}`))

const { data: existingRegs } = await supabase.from('camp_registrations').select('camp_id, student_id')
const regSet = new Set(existingRegs.map(r => `${r.camp_id}|${r.student_id}`))

const { data: intake, error: iErr } = await supabase
  .from('site_intake')
  .select('id, submitter_email, submitter_name, payload, status')
  .eq('source_form', 'camp').eq('status', 'new')
if (iErr) { console.error('site_intake:', iErr.message); process.exit(1) }

let studentsCreated = 0, linksAdded = 0, regsCreated = 0, intakeMatched = 0
const problems = []

for (const row of intake) {
  const email = norm(row.submitter_email || row.payload?.email)
  const guardianId = profileByEmail.get(email)
  if (!guardianId) { problems.push(`No portal family for ${email} (intake ${row.id.slice(0,8)}) — skipped`); continue }

  const campers = Array.isArray(row.payload?.campers) ? row.payload.campers : []
  const paidInFull = row.payload?.paid_in_full === true
  const depositPaid = row.payload?.deposit_paid === true
  const linkedStudentIds = []

  for (const camper of campers) {
    const { first, last } = splitName(camper.name)
    if (!first) { problems.push(`Camper with no name in intake ${row.id.slice(0,8)}`); continue }
    const nameKey = `${norm(first)}|${norm(last)}`

    // Find or create the student.
    let studentId = studentByName.get(nameKey)
    if (!studentId) {
      if (COMMIT) {
        const { data: ins, error } = await supabase.from('students')
          .insert({ first_name: first, last_name: last, date_of_birth: camper.birthdate || null })
          .select('id').single()
        if (error) { problems.push(`create student ${first} ${last}: ${error.message}`); continue }
        studentId = ins.id
      } else { studentId = `(new:${nameKey})` }
      studentByName.set(nameKey, studentId)
      studentsCreated++
      console.log(`  + student   ${first} ${last}${camper.birthdate ? ' (dob ' + camper.birthdate + ')' : ''}`)
    } else {
      console.log(`  = student   ${first} ${last} (exists)`)
    }
    if (!String(studentId).startsWith('(new:')) linkedStudentIds.push(studentId)

    // Link to the family.
    const linkKey = `${guardianId}|${studentId}`
    if (!linkSet.has(linkKey)) {
      if (COMMIT && !String(studentId).startsWith('(new:')) {
        const { error } = await supabase.from('guardian_students')
          .insert({ guardian_id: guardianId, student_id: studentId, relationship: 'parent', is_primary: true })
        if (error) problems.push(`link ${first} ${last}: ${error.message}`)
      }
      linkSet.add(linkKey); linksAdded++
      console.log(`    + link to ${email}`)
    }

    // One registration per week the camper selected.
    const weekItems = Array.isArray(camper.weekItems) ? camper.weekItems : []
    for (const wk of weekItems) {
      const campName = (wk.weekLabel || '').split('·').pop()?.trim()
      const camp = campByName.get(norm(campName))
      if (!camp) { problems.push(`No camp matched "${campName}" for ${first} ${last}`); continue }

      const pairKey = `${camp.id}|${studentId}`
      if (regSet.has(pairKey)) { console.log(`    = reg ${camp.name} (already registered)`); continue }

      const price = Number(wk.price) || 0
      const amountPaid = paidInFull ? price : 0
      const paymentStatus = paidInFull ? 'paid' : (depositPaid ? 'deposit' : 'unpaid')
      const reg = {
        camp_id: camp.id, student_id: studentId, guardian_id: guardianId,
        status: 'registered', payment_status: paymentStatus, amount_paid: amountPaid,
        notes: `Website form (site_intake ${row.id.slice(0,8)}) · ${wk.weekLabel} · est $${price.toFixed(2)} · payment choice: ${row.payload?.payment_choice ?? 'n/a'}`,
      }
      if (COMMIT && !String(studentId).startsWith('(new:')) {
        const { error } = await supabase.from('camp_registrations').insert(reg)
        if (error) { problems.push(`reg ${first} ${last} -> ${camp.name}: ${error.message}`); continue }
      }
      regSet.add(pairKey); regsCreated++
      console.log(`    + reg ${camp.name.padEnd(26)} ${paymentStatus} (paid $${amountPaid.toFixed(2)})`)
    }
  }

  // Mark the intake row matched.
  if (COMMIT) {
    const { error } = await supabase.from('site_intake')
      .update({ status: 'matched', linked_profile_id: guardianId, linked_student_ids: linkedStudentIds, processed_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) problems.push(`mark intake ${row.id.slice(0,8)}: ${error.message}`)
  }
  intakeMatched++
  console.log(`  ✓ intake ${row.id.slice(0,8)} -> matched\n`)
}

console.log(`=== SITE CAMP INTAKE CONVERT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`intake rows: ${intake.length} | students created: ${studentsCreated} | links added: ${linksAdded} | registrations: ${regsCreated} | intake matched: ${intakeMatched}`)
if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log('  - ' + p) }
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
console.log('')
