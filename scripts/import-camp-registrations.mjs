// Import the iClassPro "Camp Enrollments Report" (2026-06-08 export) into the
// portal `camp_registrations` table. Each enrollment links an existing student
// to the themed camp whose start_date matches the report week.
//
// The schema stores only amount_paid (no charged column), so payment_status is
// derived from charged-vs-paid and the raw figures are preserved in notes:
//   paid >= charged (incl. 0/0) -> 'paid'   (zero balance owed)
//   0 < paid < charged          -> 'deposit'
//   paid == 0, charged > 0      -> 'unpaid'
//
// DRY RUN by default. Pass --commit to write.
//   node scripts/import-camp-registrations.mjs           # preview
//   node scripts/import-camp-registrations.mjs --commit  # write
//
// Idempotent: keyed on unique(camp_id, student_id). A re-run updates
// amount_paid / payment_status / notes in place; it never duplicates.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const COMMIT = process.argv.includes('--commit')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const norm = (s) => (s ?? '').trim().toLowerCase()

// Enrollments keyed by camp start_date. [first, last, charged, paid].
const ENROLLMENTS = {
  '2026-06-15': [ // Rainbow Remix
    ['Gabriella', 'Thomas', 165.00, 0.00],
    ['Alex', 'Van Deusen', 0.00, 0.00],
    ['Amina', 'Jeter', 169.95, 109.95],
    ['Yara', 'Wilson', 165.00, 165.00],
  ],
  '2026-06-22': [ // Glow Dance Party
    ['Amina', 'Jeter', 0.00, 0.00],
    ['Lawton', 'Geisler', 231.75, 231.75],
    ['Zaylee', 'Bobbitt', 0.00, 0.00],
  ],
  '2026-06-29': [ // Pop Stars and Performers
    ['Lawton', 'Geisler', 231.75, 231.75],
    ['Yara', 'Wilson', 231.75, 185.00],
  ],
  '2026-07-06': [ // Around The World
    ['Charlotte', 'Roach', 0.00, 0.00],
    ['Yara', 'Wilson', 231.75, 185.00],
  ],
  '2026-07-13': [ // Beach Bash Boogie
    ['Dakota', 'Olsen', 231.75, 165.00],
    ['Adeline', 'Parker', 0.00, 0.00],
    ['Amina', 'Jeter', 0.00, 0.00],
  ],
  '2026-07-20': [ // Movie Magic Dance Camp
    ['Gabriella', 'Thomas', 165.00, 0.00],
  ],
  '2026-07-27': [ // Dance & Dream Spirit Week
    ['Zaylee', 'Bobbitt', 0.00, 0.00],
    ['Gabriella', 'Thomas', 165.00, 0.00],
    ['Amina', 'Jeter', 0.00, 0.00],
  ],
  '2026-08-03': [ // Princess and Heroes
    ['Yara', 'Wilson', 231.75, 185.00],
    ['Gabriella', 'Thomas', 165.00, 0.00],
  ],
}

function payStatus(charged, paid) {
  if (paid <= 0 && charged <= 0) return 'paid'   // nothing owed (charge applied on another week)
  if (paid <= 0) return 'unpaid'
  if (paid >= charged) return 'paid'
  return 'deposit'
}

// Preload camps (start_date -> {id,name}) and students (name -> id).
const { data: camps, error: cErr } = await supabase.from('camps').select('id, name, start_date')
if (cErr) { console.error('camps:', cErr.message); process.exit(1) }
const campByStart = new Map(camps.map(c => [c.start_date, c]))

const { data: students, error: sErr } = await supabase.from('students').select('id, first_name, last_name')
if (sErr) { console.error('students:', sErr.message); process.exit(1) }
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))

// Live camp_registrations has a legacy guardian_id (NOT NULL, FK profiles) that
// the canonical migration lacks. Resolve each student's primary guardian so we
// can satisfy it. Prefer is_primary, else any linked guardian.
const { data: gLinks, error: gErr } = await supabase
  .from('guardian_students').select('student_id, guardian_id, is_primary')
if (gErr) { console.error('guardian_students:', gErr.message); process.exit(1) }
const guardianByStudent = new Map()
for (const l of gLinks) {
  const cur = guardianByStudent.get(l.student_id)
  if (!cur || l.is_primary) guardianByStudent.set(l.student_id, l.guardian_id)
}

const { data: existing, error: eErr } = await supabase.from('camp_registrations').select('id, camp_id, student_id')
if (eErr) { console.error('camp_registrations:', eErr.message); process.exit(1) }
const regByPair = new Map(existing.map(r => [`${r.camp_id}|${r.student_id}`, r.id]))

let created = 0, updated = 0, errors = 0
const problems = []

for (const [startDate, rows] of Object.entries(ENROLLMENTS)) {
  const camp = campByStart.get(startDate)
  if (!camp) { problems.push(`No camp for start_date ${startDate}`); errors += rows.length; continue }

  for (const [first, last, charged, paid] of rows) {
    const studentId = studentByName.get(`${norm(first)}|${norm(last)}`)
    if (!studentId) { problems.push(`No student: ${first} ${last} (${camp.name})`); errors++; continue }

    const guardianId = guardianByStudent.get(studentId)
    if (!guardianId) { problems.push(`No guardian link: ${first} ${last} (${camp.name})`); errors++; continue }

    const row = {
      camp_id: camp.id,
      student_id: studentId,
      guardian_id: guardianId,
      status: 'registered',
      payment_status: payStatus(charged, paid),
      amount_paid: paid,
      notes: `iClassPro import 2026-06-08 · charged $${charged.toFixed(2)} · paid $${paid.toFixed(2)}`,
    }

    const pairKey = `${camp.id}|${studentId}`
    const existingId = regByPair.get(pairKey)
    const verb = existingId ? '~ update' : '+ create'
    console.log(`  ${verb}  ${camp.name.padEnd(26)} ${`${first} ${last}`.padEnd(22)} ${row.payment_status.padEnd(8)} paid $${paid.toFixed(2)}`)

    if (COMMIT) {
      if (existingId) {
        const { error } = await supabase.from('camp_registrations')
          .update({ payment_status: row.payment_status, amount_paid: row.amount_paid, notes: row.notes })
          .eq('id', existingId)
        if (error) { console.error(`    ! ${error.message}`); errors++; continue }
      } else {
        const { error } = await supabase.from('camp_registrations').insert(row)
        if (error) { console.error(`    ! ${error.message}`); errors++; continue }
      }
    }
    existingId ? updated++ : created++
  }
}

console.log(`\n=== CAMP REGISTRATION IMPORT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`created: ${created} | updated: ${updated} | errors: ${errors}`)
if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log('  - ' + p) }
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
console.log('')
