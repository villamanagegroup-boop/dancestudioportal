// READ-ONLY comprehensive audit: every website class signup (summer_class
// intake, incl. drop-ins & trials) cross-checked against the actual class
// roster (enrollments). Flags anyone who signed up but isn't enrolled.
//
//   node scripts/audit-class-signups.mjs
//
// No writes. Safe to run anytime.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const norm = s => (s ?? '').trim().toLowerCase()
// strip nicknames "Everly (Evie) Gilliam" -> "everly gilliam"
const nameKey = full => {
  const clean = (full ?? '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  return clean
}

// Website class code -> portal class UUID (from import-summer-registrations.mjs)
const CLASS_CODE = {
  'tu-tiny': 'd6d8155a-cc2f-4514-a5ef-4721eddbe844',
  'we-hh':   'eab98f92-2442-4f7b-be9e-1b91f38bf391',
  'th-tt':   'cec1f70c-5ae8-409d-832c-729543e55b9b',
  'th-tiny': 'bd681b28-5ea6-4dbc-b19e-3df1c0afc9e0',
}

const { data: classes } = await sb.from('classes').select('id, name, day_of_week, start_time')
const classById = new Map((classes ?? []).map(c => [c.id, c]))
const cname = id => { const c = classById.get(id); return c ? `${c.name} (${c.day_of_week} ${String(c.start_time).slice(0,5)})` : id }

const { data: students } = await sb.from('students').select('id, first_name, last_name')
// name -> [ids] (could be dupes)
const studentIdsByName = new Map()
for (const s of students ?? []) {
  const k = nameKey(`${s.first_name} ${s.last_name}`)
  if (!studentIdsByName.has(k)) studentIdsByName.set(k, [])
  studentIdsByName.get(k).push(s.id)
}

const { data: enrolls } = await sb.from('enrollments').select('student_id, class_id, status, archived, notes')
const enrollByStudent = new Map()
for (const e of enrolls ?? []) {
  if (!enrollByStudent.has(e.student_id)) enrollByStudent.set(e.student_id, [])
  enrollByStudent.get(e.student_id).push(e)
}

const { data: intake } = await sb.from('site_intake')
  .select('status, submitter_name, submitter_email, payload, created_at')
  .eq('source_form', 'summer_class').order('created_at')

// expand intake into one record per (dancer, class-code)
const wants = []
for (const r of intake ?? []) {
  const p = r.payload ?? {}
  if (norm(r.submitter_email) === 'p@e.com') continue // spam
  const dancers = Array.isArray(p.dancers) && p.dancers.length
    ? p.dancers
    : [{ name: p.dancer_name, classes: p.class_selection, dropInClass: p.drop_in_class, signupType: p.signup_type }]
  for (const d of dancers) {
    const codes = []
    if (d.signupType === 'drop_in' || d.dropInClass) { if (d.dropInClass) codes.push(d.dropInClass) }
    if (Array.isArray(d.classes)) codes.push(...d.classes)
    const kind = (d.signupType === 'drop_in' || p.signup_type === 'drop_in')
      ? (p.promo_code === 'TRYITFREE' || /trial/i.test(p.promo_label ?? '') ? 'TRIAL/drop-in' : 'drop-in')
      : 'class'
    for (const code of (codes.length ? codes : ['(no class)'])) {
      wants.push({
        dancer: (d.name ?? p.dancer_name ?? '').trim(),
        code, kind, parent: r.submitter_name, email: r.submitter_email,
        date: r.created_at?.slice(0, 10), paid: p.payment_received,
      })
    }
  }
}

console.log(`\n=== WEBSITE CLASS SIGNUPS → ROSTER CROSS-CHECK (${wants.length} dancer-class signups) ===\n`)
const missing = []
for (const w of wants) {
  const classId = CLASS_CODE[w.code]
  const sids = studentIdsByName.get(nameKey(w.dancer)) ?? []
  let enrolled = false, enrStatus = ''
  for (const sid of sids) {
    const e = (enrollByStudent.get(sid) ?? []).find(x => x.class_id === classId)
    if (e) { enrolled = true; enrStatus = e.status + (e.archived ? '/archived' : ''); break }
  }
  const studentExists = sids.length > 0
  const flag = enrolled ? '✅ on roster' : '❌ MISSING  '
  if (!enrolled) missing.push(w)
  console.log(`${flag}  ${w.dancer.padEnd(22)} ${(w.kind).padEnd(13)} ${cname(classId)}`)
  console.log(`             parent: ${w.parent} <${w.email}>  ${w.date}  paid:${w.paid ? 'yes' : 'NO'}  ${studentExists ? `student#${sids.length}` : 'NO student record'}${enrolled ? `  enr:${enrStatus}` : ''}`)
}

console.log(`\n=== ${missing.length} of ${wants.length} class signups are NOT on a roster ===`)
for (const m of missing) console.log(`   ❌ ${m.dancer}  ->  ${cname(CLASS_CODE[m.code])}  (${m.kind}, ${m.parent}, ${m.date})`)
if (missing.length === 0) console.log('   ✅ Everyone who signed up for a class is on the roster.')
