// READ-ONLY duplicate audit across the portal: campers (students), families
// (profiles), camps, classes, enrollments, camp registrations, and the
// site_intake triage inbox (repeat submissions + intake rows that match an
// existing student already enrolled). No writes.
//
//   node scripts/audit-duplicates.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const e = {}; for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue; let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); e[m[1]] = v }
const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY)
const norm = (s) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

const groupDup = (rows, keyFn) => {
  const g = new Map()
  for (const r of rows) { const k = keyFn(r); if (!k) continue; (g.get(k) ?? g.set(k, []).get(k)).push(r) }
  return [...g.entries()].filter(([, v]) => v.length > 1)
}

const [students, profiles, camps, classes, enrollments, campRegs, intake] = await Promise.all([
  db.from('students').select('id, first_name, last_name, date_of_birth, active, created_at').then(r => r.data ?? []),
  db.from('profiles').select('id, first_name, last_name, email, role, created_at').then(r => r.data ?? []),
  db.from('camps').select('id, name, start_date').then(r => r.data ?? []),
  db.from('classes').select('id, name, day_of_week, start_time, active').then(r => r.data ?? []),
  db.from('enrollments').select('id, student_id, class_id, status, archived').then(r => r.data ?? []),
  db.from('camp_registrations').select('id, student_id, camp_id, status').then(r => r.data ?? []),
  db.from('site_intake').select('id, source_form, submitter_email, submitter_name, payload, status, created_at').then(r => r.data ?? []),
])

const studentName = new Map(students.map(s => [s.id, `${s.first_name} ${s.last_name}`]))
const campName = new Map(camps.map(c => [c.id, c.name]))
let findings = 0

// 1. Duplicate students (same name)
console.log('\n========== 1. DUPLICATE CAMPERS / STUDENTS (same name) ==========')
const dupStudents = groupDup(students, s => `${norm(s.first_name)}|${norm(s.last_name)}`)
if (!dupStudents.length) console.log('  none')
for (const [, list] of dupStudents) {
  findings++
  console.log(`  ⚠ ${list[0].first_name} ${list[0].last_name}  (${list.length}×)`)
  for (const s of list) {
    const regs = campRegs.filter(r => r.student_id === s.id).length
    const enr = enrollments.filter(r => r.student_id === s.id && !r.archived).length
    console.log(`     ${s.id.slice(0, 8)}  dob ${s.date_of_birth ?? '—'}  active ${s.active}  created ${s.created_at?.slice(0, 10)}  · ${regs} camp regs, ${enr} class enrollments`)
  }
}

// 2. Duplicate families/profiles
console.log('\n========== 2. DUPLICATE FAMILIES / PROFILES ==========')
const dupEmail = groupDup(profiles.filter(p => p.email), p => norm(p.email))
const dupPName = groupDup(profiles, p => `${norm(p.first_name)}|${norm(p.last_name)}`).filter(([, l]) => l.some(p => p.first_name || p.last_name))
if (!dupEmail.length && !dupPName.length) console.log('  none')
for (const [email, list] of dupEmail) { findings++; console.log(`  ⚠ same email <${email}>  (${list.length}×): ${list.map(p => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() + ' [' + p.role + ' ' + p.id.slice(0, 8) + ']').join('  |  ')}`) }
for (const [, list] of dupPName) { const emails = new Set(list.map(p => norm(p.email))); if (emails.size > 1) { findings++; console.log(`  ⚠ same name, diff emails: ${list[0].first_name} ${list[0].last_name} → ${list.map(p => p.email).join(', ')}`) } }

// 3. Duplicate camps
console.log('\n========== 3. DUPLICATE CAMPS ==========')
const dupCampName = groupDup(camps, c => norm(c.name))
const dupCampDate = groupDup(camps, c => c.start_date)
if (!dupCampName.length && !dupCampDate.length) console.log('  none')
for (const [, l] of dupCampName) { findings++; console.log(`  ⚠ same name: ${l[0].name} → ${l.map(c => c.id.slice(0, 8) + ' (' + c.start_date + ')').join(', ')}`) }
for (const [d, l] of dupCampDate) { findings++; console.log(`  ⚠ same start_date ${d}: ${l.map(c => c.name).join(' | ')}`) }

// 4. Duplicate classes
console.log('\n========== 4. DUPLICATE CLASSES (name + day + time) ==========')
const dupClass = groupDup(classes, c => `${norm(c.name)}|${c.day_of_week}|${c.start_time}`)
if (!dupClass.length) console.log('  none')
for (const [, l] of dupClass) { findings++; console.log(`  ⚠ ${l[0].name} · ${l[0].day_of_week} ${l[0].start_time} → ${l.map(c => c.id.slice(0, 8) + (c.active ? '' : ' (inactive)')).join(', ')}`) }

// 5. Duplicate enrollments (student + class)
console.log('\n========== 5. DUPLICATE ENROLLMENTS (same student + class) ==========')
const dupEnr = groupDup(enrollments.filter(r => !r.archived), r => `${r.student_id}|${r.class_id}`)
if (!dupEnr.length) console.log('  none')
for (const [, l] of dupEnr) { findings++; console.log(`  ⚠ ${studentName.get(l[0].student_id) ?? l[0].student_id?.slice(0, 8)} enrolled ${l.length}× in class ${l[0].class_id?.slice(0, 8)}  (statuses: ${l.map(x => x.status).join(', ')})`) }

// 6. Duplicate camp registrations (student + camp)
console.log('\n========== 6. DUPLICATE CAMP REGISTRATIONS (same student + camp) ==========')
const dupReg = groupDup(campRegs, r => `${r.student_id}|${r.camp_id}`)
if (!dupReg.length) console.log('  none (unique constraint holds)')
for (const [, l] of dupReg) { findings++; console.log(`  ⚠ ${studentName.get(l[0].student_id)} ×${l.length} in ${campName.get(l[0].camp_id)}`) }

// 7. site_intake repeat submissions (same email + form)
console.log('\n========== 7. INTAKE REPEAT SUBMISSIONS (same email + form) ==========')
const dupIntake = groupDup(intake.filter(r => r.submitter_email), r => `${r.source_form}|${norm(r.submitter_email)}`)
if (!dupIntake.length) console.log('  none')
for (const [, l] of dupIntake) { findings++; console.log(`  ⚠ ${l[0].source_form}: <${l[0].submitter_email}> submitted ${l.length}× — ${l.map(r => r.created_at?.slice(0, 10) + ' [' + r.status + ']').join(', ')}`) }

// 8. Intake camp rows whose camper already exists / is already registered
console.log('\n========== 8. INTAKE CAMP ROWS MATCHING EXISTING STUDENTS (double-enroll risk) ==========')
const studentByName = new Map(students.map(s => [`${norm(s.first_name)}|${norm(s.last_name)}`, s.id]))
let any8 = false
for (const r of intake.filter(r => r.source_form === 'camp' && r.status === 'new')) {
  const campers = Array.isArray(r.payload?.campers) ? r.payload.campers : []
  for (const c of campers) {
    const parts = (c.name ?? '').trim().split(/\s+/)
    const key = `${norm(parts[0])}|${norm(parts.slice(1).join(' '))}`
    const sid = studentByName.get(key)
    if (sid) {
      any8 = true; findings++
      const regs = campRegs.filter(x => x.student_id === sid).map(x => campName.get(x.camp_id))
      console.log(`  ⚠ intake ${r.id.slice(0, 8)} "${c.name}" matches student ${sid.slice(0, 8)} — already has ${regs.length} camp reg(s)${regs.length ? ': ' + regs.join(', ') : ''}`)
    }
  }
}
if (!any8) console.log('  none')

console.log(`\n========== SUMMARY: ${findings} duplicate group(s)/conflict(s) flagged ==========\n`)
