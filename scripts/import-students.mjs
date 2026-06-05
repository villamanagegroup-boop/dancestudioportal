// Import the iClassPro "Custom Student List" (109 rows) as students and link
// each to its already-existing parent profile(s). Parents are NOT created or
// modified — they already exist in `profiles`. Students are created without a
// DOB (optional column). Co-guardian duplicate rows are merged into one student
// with two guardian links. Three test rows are skipped.
//
// DRY RUN by default. Pass --commit to actually write.
//   node scripts/import-students.mjs           # preview
//   node scripts/import-students.mjs --commit  # write
//
// Idempotent: a student matched by (first,last) case-insensitively is not
// recreated, and existing guardian links are not duplicated.

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

// first, last, primary guardian email, [secondary guardian emails].
// Co-guardian duplicate child rows already merged (Banas Abigail, Bobbitt
// Zaylee, Haygood Caroline). Test rows (Doe, Rabenhorst, Testing Student)
// omitted. Secondary guardians without a known email are omitted (no account
// to link to): Collie Brandon, Fleshman Brian/Dunnavent Chelsea, Jackson
// O'York/Hudson, Jeter Jerome, Monroe Stephen, Smith Zachary, Wilson
// Christopher, Vincent O'York/Hudson.
const DATA = [
  { first: 'Kayarie', last: 'Accilien', primary: 'accilienkh@gmail.com' },
  { first: 'Harley', last: 'Adkins', primary: 'mrschanteladkins@gmail.com' },
  { first: 'Ariana', last: 'Ahuja', primary: 'vahujadds@yahoo.com' },
  { first: 'Alexandra', last: 'Albert-Moore', primary: 'jennifer.m.moore314@gmail.com' },
  { first: 'Theodore', last: 'Allen', primary: 'stephanie.spera@gmail.com' },
  { first: 'Abigail', last: 'Banas', primary: 'milelizab@gmail.com', secondary: ['colinbanas@gmail.com'] },
  { first: 'Alex', last: 'Banas', primary: 'milelizab@gmail.com' },
  { first: 'Lucy', last: 'Barazoto', primary: 'barazotojessica@gmail.com' },
  { first: 'Nishaun', last: 'Battle', primary: 'info@nishaunbattle.com' },
  { first: 'Zaylee', last: 'Bobbitt', primary: 'missmelinda101@gmail.com', secondary: ['melindab101@gmail.com'] },
  { first: 'Miles', last: 'Broom', primary: 'barrowam@gmail.com' },
  { first: 'Vivienne', last: 'Broom', primary: 'barrowam@gmail.com' },
  { first: 'Alana', last: 'Brown', primary: 'allabrown88@gmail.com' },
  { first: 'Liev', last: 'Brown', primary: 'allabrown88@gmail.com' },
  { first: 'Emmie', last: 'Burkey', primary: 'katygin@gmail.com' },
  { first: 'Ava', last: 'Bush', primary: 'jennavi06@gmail.com' },
  { first: 'Dune', last: 'Calder', primary: 'brockmann.susan@gmail.com' },
  { first: 'Luna', last: 'Calder', primary: 'brockmann.susan@gmail.com' },
  { first: 'Riley', last: 'Carroll', primary: 'walburna@gmail.com' },
  { first: 'Rory', last: 'Carroll', primary: 'walburna@gmail.com' },
  { first: 'Rhaelind', last: 'Carter', primary: 'rccarter3475@gmail.com' },
  { first: 'Everleigh', last: 'Clodfelter', primary: 'abby.clodfelter1020@gmail.com' },
  { first: 'Salem', last: 'Coleman', primary: 'slims823@gmail.com' },
  { first: 'Selai', last: 'Coleman', primary: 'slims823@gmail.com' },
  { first: 'Briar', last: 'Collie', primary: 'kenzie.jane@hotmail.com' },
  { first: 'Charlie', last: 'Cook', primary: 'krobertsa13@gmail.com' },
  { first: 'Kimorah', last: 'Dark', primary: 'yamayah@gmail.com' },
  { first: 'Katherine', last: 'Dean', primary: 'joe.a.dean@gmail.com' },
  { first: 'Bristol', last: 'Denton', primary: 'dentonrickie@gmail.com' },
  { first: 'Emmy', last: 'Edwards', primary: 'ekeeli@hotmail.com' },
  { first: 'Isabella', last: 'Faircloth', primary: 'monicasfaircloth@gmail.com' },
  { first: 'Dakota', last: 'Fleshman', primary: 'rodriguezay13@gmail.com' },
  { first: 'Kit', last: 'Foley', primary: 'michelle.foley85@gmail.com' },
  { first: 'Valeria', last: 'Garcia', primary: 'chjessua@gmail.com' },
  { first: 'Lawton', last: 'Geisler', primary: 'connect@blended-health.com' },
  { first: 'Yuna', last: 'Gill', primary: 'youlee.h.kim@gmail.com' },
  { first: 'Everly', last: 'Gilliam', primary: 'fisher.colleen@gmail.com' },
  { first: 'Genevieve', last: 'Gray', primary: 'hicksch7@gmail.com' },
  { first: 'Kayla', last: 'Gray', primary: 'hicksch7@gmail.com' },
  { first: 'Logan', last: 'Gray', primary: 'gummiebunny01@gmail.com' },
  { first: 'Caydence', last: 'Harris', primary: 'cghughes2006@gmail.com' },
  { first: 'Mariah', last: 'Harris', primary: 'swilson0@yahoo.com' },
  { first: 'Caroline', last: 'Haygood', primary: 'ekeeli@hotmail.com', secondary: ['beckyjean.young@gmail.com'] },
  { first: 'Maggie', last: 'Hughes', primary: 'jessiehughes86@gmail.com' },
  { first: 'Chloe', last: 'Hull', primary: 'amstrim@gmail.com' },
  { first: 'Madilyn', last: 'Jackson', primary: 'tmoyork5@gmail.com' },
  { first: 'Frank', last: 'Jacocks', primary: 'fjacocks@gmail.com' },
  { first: 'Amina', last: 'Jeter', primary: 'k.battle34@myyahoo.com' },
  { first: 'Czar', last: 'Jones', primary: 'chiquetajones@yahoo.com' },
  { first: 'Maddie', last: 'Kreidel', primary: 'mph09c@gmail.com' },
  { first: 'Jennifer', last: 'Kreizenbeck', primary: 'jennifer.kreizenbeck@gmail.com' },
  { first: 'Francesca', last: 'La Civita', primary: 'flacivita1@gmail.com' },
  { first: 'Allie', last: 'Laning', primary: 'jane.chalkley@gmail.com' },
  { first: 'Dominic', last: 'Larkins', primary: 'aljewett@ymail.com' },
  { first: 'Sophia', last: 'Larkins', primary: 'aljewett@ymail.com' },
  { first: 'Benjamin', last: 'Ledford', primary: 'splaersgirl@gmail.com' },
  { first: 'Elora', last: 'Ledford', primary: 'splaersgirl@gmail.com' },
  { first: 'Penelope', last: 'Ledford', primary: 'splaersgirl@gmail.com' },
  { first: 'Summer', last: 'Ledford', primary: 'splaersgirl@gmail.com' },
  { first: 'Genevieve', last: 'Love', primary: 'heathermachelleandrews@gmail.com' },
  { first: 'Allison', last: 'Maier', primary: 'allisonmm1995@yahoo.com' },
  { first: 'Parker', last: 'McConville', primary: 'angela@certifikid.com' },
  { first: 'Raelynn', last: 'McDaniel', primary: 'tuleftfeet@gmail.com', secondary: ['gmichaelmcdaniel@gmail.com'] },
  { first: 'Georgia', last: 'Miller', primary: 'avitablec@gmail.com' },
  { first: 'Amelia', last: 'Monroe', primary: 'monroerc@alumni.vcu.edu' },
  { first: 'Marie', last: 'Moorehouse', primary: 'mariemoorehouse@usa.com' },
  { first: 'Holly', last: 'Moro', primary: 'caitlinbmullen@gmail.com' },
  { first: 'Billy', last: 'Morris', primary: 'morris.soraya@gmail.com' },
  { first: 'Abby', last: 'Murray', primary: 'mariannekoval@yahoo.com' },
  { first: 'Eleanor', last: 'Murray', primary: 'mariannekoval@yahoo.com' },
  { first: 'Nicole', last: 'Negron', primary: 'sheellymaldonado14@gmail.com' },
  { first: 'Ailani', last: 'Negron', primary: 'sheellymaldonado14@gmail.com' },
  { first: 'Dakota', last: 'Olsen', primary: 'shelleypickolsen@gmail.com' },
  { first: 'Paige', last: 'Pamulapati', primary: 'lgrecheck@gmail.com' },
  { first: 'Adeline', last: 'Parker', primary: 'ashtonparkr@gmail.com' },
  { first: 'Charlotte', last: 'Parker', primary: 'britten.parker@gmail.com', secondary: ['dave.parker@capitalone.com'] },
  { first: 'Zoe', last: 'Peppers', primary: 'bloodycontessa@gmail.com' },
  { first: 'Veronica', last: 'Poerstel', primary: 'ashleyfmonfort@gmail.com' },
  { first: 'Margaret', last: 'Potter', primary: 'jessica.potter419@gmail.com' },
  { first: 'Zymara', last: 'Reed', primary: 'jenna.michael98@gmail.com' },
  { first: 'Evie', last: 'Rennolds', primary: 'hfuller2@gmail.com' },
  { first: 'Charlotte', last: 'Roach', primary: 'snconti27@yahoo.com' },
  { first: 'Marlee', last: 'Rosen', primary: 'regina.rosen1989@gmail.com' },
  { first: 'Margot', last: 'Sandlin', primary: 'madisongongaware@gmail.com' },
  { first: 'June', last: 'Schindler', primary: 'erwinthrop@gmail.com' },
  { first: 'Hadley', last: 'Scott', primary: 'heatherscott@walnuthillpharmacy.com' },
  { first: 'Susan', last: 'Sekerke', primary: 'sjsekerke@gmail.com' },
  { first: 'Olive', last: 'Singleton', primary: 'jamieloftis5@gmail.com' },
  { first: 'Pepper', last: 'Singleton', primary: 'jamieloftis5@gmail.com' },
  { first: 'Kenzo', last: 'Smith', primary: 'cehsmith2@gmail.com' },
  { first: 'Morgan', last: 'Smith', primary: 'smithle1030@gmail.com' },
  { first: 'Kinsley', last: 'Stank', primary: 'kimgregg4@gmail.com' },
  { first: 'Stella', last: 'Stannard', primary: 'shannon_taylor27@yahoo.com' },
  { first: 'Gabriella', last: 'Thomas', primary: 'cchhdd16@yahoo.com' },
  { first: 'Madeline', last: 'Tierney', primary: 'jacq87@gmail.com' },
  { first: 'Sena', last: 'Torres', primary: 'kris10ad@gmail.com' },
  { first: 'Alex', last: 'Van Deusen', primary: 'mollievandeusen@gmail.com' },
  { first: 'June', last: 'Vigliano', primary: 'cougotme@gmail.com' },
  { first: 'Ellanor', last: 'Vincent', primary: 'tmoyork5@gmail.com' },
  { first: 'Evelynn', last: 'Vincent', primary: 'tmoyork5@gmail.com' },
  { first: 'Kadison', last: 'Wilson', primary: 'swilson0@yahoo.com' },
  { first: 'Yara', last: 'Wilson', primary: 'tazashia.wilson@yahoo.com' },
  { first: 'Martine', last: 'Wladar', primary: 'tinawlad@hotmail.com' },
]

const norm = (s) => s.trim().toLowerCase()

// Preload profiles (email -> id) and existing students (name -> id).
const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email')
if (pErr) { console.error('profiles:', pErr.message); process.exit(1) }
const profileByEmail = new Map(profiles.map(p => [norm(p.email ?? ''), p.id]))

const { data: students, error: sErr } = await supabase.from('students').select('id, first_name, last_name')
if (sErr) { console.error('students:', sErr.message); process.exit(1) }
const studentByName = new Map(students.map(s => [`${norm(s.first_name ?? '')}|${norm(s.last_name ?? '')}`, s.id]))

const { data: links, error: lErr } = await supabase.from('guardian_students').select('guardian_id, student_id')
if (lErr) { console.error('guardian_students:', lErr.message); process.exit(1) }
const linkSet = new Set(links.map(l => `${l.guardian_id}|${l.student_id}`))

let created = 0, skippedExisting = 0, linksAdded = 0, linksExisting = 0
const unmatchedPrimary = [], unmatchedSecondary = []

for (const row of DATA) {
  const nameKey = `${norm(row.first)}|${norm(row.last)}`
  const primaryId = profileByEmail.get(norm(row.primary))
  if (!primaryId) {
    unmatchedPrimary.push(`${row.first} ${row.last} -> ${row.primary}`)
  }

  // Find or create the student.
  let studentId = studentByName.get(nameKey)
  if (studentId) {
    skippedExisting++
  } else if (COMMIT) {
    const { data: ins, error } = await supabase.from('students')
      .insert({ first_name: row.first, last_name: row.last, date_of_birth: null })
      .select('id').single()
    if (error) { console.error(`  ! create ${row.first} ${row.last}:`, error.message); continue }
    studentId = ins.id
    studentByName.set(nameKey, studentId)
    created++
  } else {
    created++ // would create
    studentId = `(new:${nameKey})`
  }

  // Link guardians (primary first, then secondaries). Only to existing profiles.
  const guardians = [{ id: primaryId, is_primary: true }]
  for (const sec of row.secondary ?? []) {
    const secId = profileByEmail.get(norm(sec))
    if (!secId) { unmatchedSecondary.push(`${row.first} ${row.last} -> ${sec}`); continue }
    guardians.push({ id: secId, is_primary: false })
  }

  for (const g of guardians) {
    if (!g.id) continue
    const linkKey = `${g.id}|${studentId}`
    if (linkSet.has(linkKey)) { linksExisting++; continue }
    if (COMMIT && !String(studentId).startsWith('(new:')) {
      const { error } = await supabase.from('guardian_students')
        .insert({ guardian_id: g.id, student_id: studentId, relationship: 'parent', is_primary: g.is_primary })
      if (error) { console.error(`  ! link ${row.first} ${row.last}:`, error.message); continue }
    }
    linkSet.add(linkKey)
    linksAdded++
  }
}

console.log(`\n=== STUDENT IMPORT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`rows in list:        ${DATA.length}`)
console.log(`students created:    ${created}`)
console.log(`students skipped (already existed): ${skippedExisting}`)
console.log(`guardian links added:    ${linksAdded}`)
console.log(`guardian links existing: ${linksExisting}`)

console.log(`\nunmatched PRIMARY guardians (student left unlinked!): ${unmatchedPrimary.length}`)
for (const u of unmatchedPrimary) console.log('  - ' + u)

console.log(`\nunmatched SECONDARY guardians (no account — skipped, expected): ${unmatchedSecondary.length}`)
for (const u of unmatchedSecondary) console.log('  - ' + u)

if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
console.log('')
