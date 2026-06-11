// READ-ONLY diagnostic for the camp-enrollment import + site-form pull.
// 1. Lists portal camps (id, name, dates).
// 2. Pulls site-form camp registrations (site_intake where source_form='camp').
// 3. Confirms each PDF camper exists as a student (and is guardian-linked).
// No writes. Safe to run anytime.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const norm = (s) => (s ?? '').trim().toLowerCase()

// PDF campers (distinct) we expect to enroll.
const PDF_CAMPERS = [
  ['Gabriella', 'Thomas'], ['Alex', 'Van Deusen'], ['Amina', 'Jeter'],
  ['Yara', 'Wilson'], ['Lawton', 'Geisler'], ['Zaylee', 'Bobbitt'],
  ['Charlotte', 'Roach'], ['Dakota', 'Olsen'], ['Adeline', 'Parker'],
]

// --- Camps ---
const { data: camps, error: cErr } = await supabase
  .from('camps').select('id, name, start_date, end_date').order('start_date')
if (cErr) { console.error('camps:', cErr.message); process.exit(1) }
console.log('\n=== PORTAL CAMPS ===')
for (const c of camps) console.log(`  ${c.start_date}..${c.end_date}  ${c.name}`)
console.log(`  (${camps.length} camps)`)

// --- Site-form camp registrations ---
const { data: intake, error: iErr } = await supabase
  .from('site_intake')
  .select('id, status, submitter_name, submitter_email, payload, created_at')
  .eq('source_form', 'camp')
  .order('created_at', { ascending: false })
if (iErr) { console.error('site_intake:', iErr.message); process.exit(1) }

console.log('\n=== WEBSITE-FORM CAMP REGISTRATIONS (site_intake, source_form=camp) ===')
if (!intake.length) console.log('  (none found)')
for (const r of intake) {
  console.log(`\n  • ${r.submitter_name ?? '(no name)'} <${r.submitter_email ?? 'no email'}>  [${r.status}]  ${r.created_at}`)
  console.log(`    payload: ${JSON.stringify(r.payload)}`)
}
console.log(`\n  total site-form camp rows: ${intake.length}`)

// Status breakdown across ALL site_intake (context)
const { data: allIntake } = await supabase.from('site_intake').select('source_form, status')
if (allIntake) {
  const byForm = {}
  for (const r of allIntake) {
    byForm[r.source_form] ??= {}
    byForm[r.source_form][r.status] = (byForm[r.source_form][r.status] ?? 0) + 1
  }
  console.log('\n=== ALL SITE_INTAKE BY FORM/STATUS ===')
  console.log('  ' + JSON.stringify(byForm))
}

// --- Confirm PDF campers exist as students ---
const { data: students, error: sErr } = await supabase
  .from('students').select('id, first_name, last_name')
if (sErr) { console.error('students:', sErr.message); process.exit(1) }
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))

const { data: links } = await supabase.from('guardian_students').select('student_id')
const linkedStudentIds = new Set((links ?? []).map(l => l.student_id))

console.log('\n=== PDF CAMPERS → STUDENT MATCH ===')
let missing = 0
for (const [first, last] of PDF_CAMPERS) {
  const id = studentByName.get(`${norm(first)}|${norm(last)}`)
  const linked = id && linkedStudentIds.has(id) ? 'linked' : 'NO GUARDIAN LINK'
  if (!id) missing++
  console.log(`  ${`${first} ${last}`.padEnd(24)} ${id ? `✓ ${id.slice(0, 8)}  ${linked}` : '❌ MISSING STUDENT'}`)
}
console.log(`\n  ${PDF_CAMPERS.length - missing}/${PDF_CAMPERS.length} campers found as students`)
console.log('')
