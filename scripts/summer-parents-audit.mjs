// Read-only audit: who are ALL the summer-class parents, across the portal
// (enrollments -> students -> guardians) AND the website registration JSON?
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
const norm = s => (s ?? '').trim().toLowerCase()

// All summer classes (Tue/Wed/Thu session) and their enrollments.
const { data: classes } = await supabase.from('classes')
  .select('id, name, day_of_week, start_time').order('day_of_week')
const classById = new Map(classes.map(c => [c.id, c]))

const { data: enrolls } = await supabase.from('enrollments')
  .select('student_id, class_id, status, archived')
const active = (enrolls ?? []).filter(e => !e.archived)

const { data: students } = await supabase.from('students')
  .select('id, first_name, last_name, emergency_contact_name, emergency_contact_phone')
const studentById = new Map(students.map(s => [s.id, s]))

const { data: links } = await supabase.from('guardian_students').select('guardian_id, student_id')
const guardiansByStudent = new Map()
for (const l of links ?? []) {
  if (!guardiansByStudent.has(l.student_id)) guardiansByStudent.set(l.student_id, [])
  guardiansByStudent.get(l.student_id).push(l.guardian_id)
}

const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name')
const profileById = new Map(profiles.map(p => [p.id, p]))

// Build the portal-side summer parent set.
const portalParents = new Map() // email -> {name, kids:Set}
const orphanStudents = []        // enrolled students with NO guardian account
for (const e of active) {
  const s = studentById.get(e.student_id); if (!s) continue
  const kid = `${s.first_name} ${s.last_name}`.trim()
  const cls = classById.get(e.class_id)
  const guardianIds = guardiansByStudent.get(e.student_id) ?? []
  const accounts = guardianIds.map(id => profileById.get(id)).filter(Boolean).filter(p => p.email)
  if (accounts.length === 0) {
    orphanStudents.push({ kid, cls: cls?.name, contact: s.emergency_contact_name, phone: s.emergency_contact_phone })
    continue
  }
  for (const p of accounts) {
    const key = norm(p.email)
    if (!portalParents.has(key)) portalParents.set(key, { name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), email: p.email, kids: new Set() })
    portalParents.get(key).kids.add(kid)
  }
}

// Website registration JSON.
const reg = JSON.parse(readFileSync('C:/Users/hicks/Downloads/summer_class_registrations_rows.json', 'utf8'))
const webParents = new Map() // email -> {name, kids:Set}
for (const r of reg) {
  if (norm(r.email) === 'p@e.com') continue // spam
  if (!r.email) continue
  const key = norm(r.email)
  if (!webParents.has(key)) webParents.set(key, { name: r.parent_name, email: r.email, kids: new Set() })
  webParents.get(key).kids.add((r.dancer_name ?? '').trim())
}

console.log(`\n=== PORTAL: parents with a portal account & a summer enrollment (${portalParents.size}) ===`)
for (const p of portalParents.values()) console.log(`  ${p.email.padEnd(36)} ${p.name.padEnd(22)} kids: ${[...p.kids].join(', ')}`)

console.log(`\n=== PORTAL: enrolled students with NO parent account (unreachable by a profiles blast) (${orphanStudents.length}) ===`)
for (const o of orphanStudents) console.log(`  ${(o.kid).padEnd(24)} ${String(o.cls).padEnd(34)} contact: ${o.contact ?? '—'} ${o.phone ?? ''}`)

console.log(`\n=== WEBSITE registration emails (spam removed) (${webParents.size}) ===`)
for (const p of webParents.values()) console.log(`  ${p.email.padEnd(36)} ${(p.name ?? '').padEnd(22)} kids: ${[...p.kids].join(', ')}`)

// Union, and who is reachable where.
const allEmails = new Set([...portalParents.keys(), ...webParents.keys()])
console.log(`\n=== UNION of all summer parent emails (${allEmails.size}) ===`)
for (const key of allEmails) {
  const inPortal = portalParents.has(key) ? 'portal' : '      '
  const inWeb = webParents.has(key) ? 'web' : '   '
  const rec = portalParents.get(key) ?? webParents.get(key)
  console.log(`  [${inPortal} ${inWeb}] ${rec.email}`)
}
