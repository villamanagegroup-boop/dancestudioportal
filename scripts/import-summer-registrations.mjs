// Import summer-class website registrations into the portal as students +
// enrollments. Source: ~/Downloads/summer_class_registrations_rows.json
//
// - Spam row (P / D / p@e.com) is skipped.
// - Website class codes are mapped to portal class UUIDs by day+time.
// - New students are created with parent name/phone in emergency_contact_*;
//   no portal account (profile) is created. Existing students are reused.
// - Existing parent profiles are linked via guardian_students when found.
// - Leonardo Harris (never paid) -> enrollment status 'pending'.
// - Benjamin Jordan-Arditi (free-trial drop-in) -> enrolled with a drop-in note.
//
// DRY RUN by default. Pass --commit to write.
//   node scripts/import-summer-registrations.mjs           # preview
//   node scripts/import-summer-registrations.mjs --commit  # write
//
// Idempotent: students matched by (first,last) case-insensitively are reused;
// an enrollment for an existing (student, class) pair is not duplicated.

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

// Website class code -> portal class UUID (matched by day + time)
const CLASS = {
  'tu-tiny': 'd6d8155a-cc2f-4514-a5ef-4721eddbe844', // Tue 5:30 Tiny Ballet + Tumble
  'we-hh':   'eab98f92-2442-4f7b-be9e-1b91f38bf391', // Wed 6:30 Hip Hop
  'th-tt':   'cec1f70c-5ae8-409d-832c-729543e55b9b', // Thu 7:00 Tik Tok Hip Hop Workshop
  'th-tiny': 'bd681b28-5ea6-4dbc-b19e-3df1c0afc9e0', // Thu 5:30 Tiny Ballet + Tumble
}

const g = (s) => s === 'Female' ? 'female' : s === 'Male' ? 'male' : null

// One row per dancer to enroll.
const DATA = [
  { first: 'Everly',   last: 'Gilliam',       gender: g(null),     code: 'tu-tiny', status: 'active',
    parent: 'Colleen Gilliam', email: 'fisher.colleen@gmail.com', phone: '8482039619',
    note: 'Summer 2026 (website). Paid in full $120 (PayPal 0GU63530TA8247044).' },
  { first: 'Stella',   last: 'Meagher',       gender: g('Female'), code: 'we-hh',   status: 'active',
    parent: 'Lauren Meagher', email: 'laurenpatton4@gmail.com', phone: '8044373660',
    note: 'Summer 2026 (website). Deposit $100 of $240 (2 dancers, PayPal 8GN935423G572053U).' },
  { first: 'Piper',    last: 'Meagher',       gender: g('Female'), code: 'we-hh',   status: 'active',
    parent: 'Lauren Meagher', email: 'laurenpatton4@gmail.com', phone: '8044373660',
    note: 'Summer 2026 (website). Deposit $100 of $240 (2 dancers, PayPal 8GN935423G572053U).' },
  { first: 'Laura',    last: 'Brandao',       gender: g('Female'), code: 'we-hh',   status: 'active',
    parent: 'Julia Brandao', email: 'jbjalbert5@gmail.com', phone: '8043472882',
    note: 'Summer 2026 (website). Paid in full $120 (PayPal 63A15638N1775831U).' },
  { first: 'Adelaide', last: 'Hart',          gender: g('Female'), code: 'we-hh',   status: 'active',
    parent: 'Elizabeth Hart', email: 'Elizabethwhart12@gmail.com', phone: '7576414978',
    note: 'Summer 2026 (website). Deposit $50 (PayPal 1A375236R5516004A). Parent note: will miss first class (vacation).' },
  { first: 'Leia',     last: 'Kauffman',      gender: g('Female'), code: 'th-tt',   status: 'active',
    parent: 'Sochitl K Rodriguez', email: 'Sochitl.R@gmail.com', phone: '5714291042',
    note: 'Summer 2026 (website). Deposit $50 (PayPal 3DS40517WX3307415).' },
  { first: 'Kennedy',  last: 'Carver',        gender: g('Female'), code: 'th-tiny', status: 'active',
    parent: 'Samantha Carver', email: 'samrhine123@icloud.com', phone: '5403956850',
    note: 'Summer 2026 (website). Deposit $50 (PayPal 3M016856M9933344Y).' },
  { first: 'Benjamin', last: 'Jordan-Arditi', gender: g('Male'),   code: 'we-hh',   status: 'active',
    parent: 'Chloe Arditi', email: 'chloearditi@gmail.com', phone: '',
    note: 'FREE TRIAL DROP-IN — Wed Hip Hop Week 1 (Jun 23–28) ONLY, not a full season enrollment. Promo TRYITFREE.' },
  { first: 'Leonardo', last: 'Harris',        gender: g('Male'),   code: 'we-hh',   status: 'pending',
    parent: 'Casey Cherubini', email: 'Love2write92@yahoo.com', phone: '',
    note: 'Summer 2026 (website). UNPAID — no PayPal order recorded. Enrolled pending payment.' },
]

const norm = (s) => (s ?? '').trim().toLowerCase()

// Fetch each target class's season_id so enrollments line up with the class.
const classIds = [...new Set(Object.values(CLASS))]
const { data: cls, error: cErr } = await supabase.from('classes').select('id, season_id').in('id', classIds)
if (cErr) { console.error('classes:', cErr.message); process.exit(1) }
const seasonByClass = new Map(cls.map(c => [c.id, c.season_id]))

const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email')
if (pErr) { console.error('profiles:', pErr.message); process.exit(1) }
const profileByEmail = new Map(profiles.map(p => [norm(p.email), p.id]))

const { data: students, error: sErr } = await supabase.from('students').select('id, first_name, last_name')
if (sErr) { console.error('students:', sErr.message); process.exit(1) }
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))

const { data: links } = await supabase.from('guardian_students').select('guardian_id, student_id')
const linkSet = new Set((links ?? []).map(l => `${l.guardian_id}|${l.student_id}`))

const { data: enrolls } = await supabase.from('enrollments').select('student_id, class_id')
const enrollSet = new Set((enrolls ?? []).map(e => `${e.student_id}|${e.class_id}`))

let studentsCreated = 0, studentsReused = 0, enrollAdded = 0, enrollExisting = 0, linksAdded = 0

for (const r of DATA) {
  const nameKey = `${norm(r.first)}|${norm(r.last)}`
  const classId = CLASS[r.code]
  let studentId = studentByName.get(nameKey)

  if (studentId) {
    studentsReused++
  } else if (COMMIT) {
    const { data: ins, error } = await supabase.from('students').insert({
      first_name: r.first, last_name: r.last, date_of_birth: null, gender: r.gender,
      emergency_contact_name: r.parent || null,
      emergency_contact_phone: r.phone || null,
    }).select('id').single()
    if (error) { console.error(`  ! create ${r.first} ${r.last}:`, error.message); continue }
    studentId = ins.id
    studentByName.set(nameKey, studentId)
    studentsCreated++
  } else {
    studentsCreated++
    studentId = `(new:${nameKey})`
  }

  // Link existing parent profile (only when the parent already has an account).
  const guardianId = profileByEmail.get(norm(r.email))
  if (guardianId && !String(studentId).startsWith('(new:')) {
    const linkKey = `${guardianId}|${studentId}`
    if (!linkSet.has(linkKey)) {
      if (COMMIT) {
        const { error } = await supabase.from('guardian_students')
          .insert({ guardian_id: guardianId, student_id: studentId, relationship: 'parent', is_primary: true })
        if (error) console.error(`  ! link ${r.first} ${r.last}:`, error.message)
      }
      linkSet.add(linkKey); linksAdded++
    }
  }

  // Enrollment (skip if this student is already in this class).
  const enrollKey = `${studentId}|${classId}`
  if (enrollSet.has(enrollKey)) {
    enrollExisting++
  } else {
    if (COMMIT && !String(studentId).startsWith('(new:')) {
      const { error } = await supabase.from('enrollments').insert({
        student_id: studentId, class_id: classId, season_id: seasonByClass.get(classId) ?? null,
        status: r.status, notes: r.note,
      })
      if (error) { console.error(`  ! enroll ${r.first} ${r.last}:`, error.message); continue }
    }
    enrollSet.add(enrollKey); enrollAdded++
  }

  const parentTag = guardianId ? 'linked' : 'no acct'
  console.log(`${(r.first + ' ' + r.last).padEnd(24)} -> ${r.code.padEnd(8)} ${r.status.padEnd(8)} student:${studentByName.get(nameKey) ? 'reuse' : 'new'} parent:${parentTag}`)
}

console.log(`\n=== SUMMER REG IMPORT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`dancers processed:   ${DATA.length}  (spam row skipped)`)
console.log(`students created:    ${studentsCreated}`)
console.log(`students reused:     ${studentsReused}`)
console.log(`enrollments added:   ${enrollAdded}`)
console.log(`enrollments existing:${enrollExisting}`)
console.log(`guardian links added:${linksAdded}`)
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
