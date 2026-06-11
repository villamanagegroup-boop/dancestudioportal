// READ-ONLY diagnostic: snapshot current families/students before the
// iClassPro student-list import. Prints counts + existing emails/names so we
// can plan dedupe and avoid clobbering real accounts (e.g. the admin login).

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

const { data: profiles, error: pErr } = await supabase
  .from('profiles')
  .select('id, email, first_name, last_name, role, extra_roles')
if (pErr) { console.error('profiles:', pErr.message); process.exit(1) }

const { data: students, error: sErr } = await supabase
  .from('students')
  .select('id, first_name, last_name, date_of_birth')
if (sErr) { console.error('students:', sErr.message); process.exit(1) }

const { data: gs, error: gErr } = await supabase
  .from('guardian_students')
  .select('guardian_id, student_id, is_primary')
if (gErr) { console.error('guardian_students:', gErr.message); process.exit(1) }

const byRole = {}
for (const p of profiles) byRole[p.role ?? 'null'] = (byRole[p.role ?? 'null'] ?? 0) + 1

console.log('\n=== CURRENT DB STATE ===')
console.log('profiles total:', profiles.length, '| by role:', JSON.stringify(byRole))
console.log('students total:', students.length)
console.log('guardian_students links:', gs.length)

console.log('\n=== EXISTING PROFILES (email — name — role) ===')
for (const p of [...profiles].sort((a, b) => (a.email ?? '').localeCompare(b.email ?? '')))
  console.log(`  ${(p.email ?? '(no email)').padEnd(38)} ${`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim().padEnd(28)} ${p.role ?? ''}${p.extra_roles?.length ? ' +' + p.extra_roles.join(',') : ''}`)

console.log('\n=== EXISTING STUDENTS (last, first — dob) ===')
for (const s of [...students].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)))
  console.log(`  ${`${s.last_name ?? ''}, ${s.first_name ?? ''}`.padEnd(34)} ${s.date_of_birth ?? ''}`)

// Cross-check the PDF's primary-guardian emails against what already exists.
const pdfEmails = `accilienkh@gmail.com mrschanteladkins@gmail.com vahujadds@yahoo.com jennifer.m.moore314@gmail.com stephanie.spera@gmail.com milelizab@gmail.com colinbanas@gmail.com barazotojessica@gmail.com info@nishaunbattle.com missmelinda101@gmail.com melindab101@gmail.com barrowam@gmail.com allabrown88@gmail.com katygin@gmail.com jennavi06@gmail.com brockmann.susan@gmail.com walburna@gmail.com rccarter3475@gmail.com abby.clodfelter1020@gmail.com slims823@gmail.com kenzie.jane@hotmail.com krobertsa13@gmail.com yamayah@gmail.com joe.a.dean@gmail.com dentonrickie@gmail.com jdoe@demo.com ekeeli@hotmail.com monicasfaircloth@gmail.com rodriguezay13@gmail.com michelle.foley85@gmail.com chjessua@gmail.com connect@blended-health.com youlee.h.kim@gmail.com fisher.colleen@gmail.com hicksch7@gmail.com gummiebunny01@gmail.com cghughes2006@gmail.com swilson0@yahoo.com beckyjean.young@gmail.com jessiehughes86@gmail.com amstrim@gmail.com tmoyork5@gmail.com fjacocks@gmail.com k.battle34@myyahoo.com chiquetajones@yahoo.com mph09c@gmail.com jennifer.kreizenbeck@gmail.com flacivita1@gmail.com jane.chalkley@gmail.com mariannekoval@yahoo.com sheellymaldonado14@gmail.com shelleypickolsen@gmail.com lgrecheck@gmail.com ashtonparkr@gmail.com britten.parker@gmail.com bloodycontessa@gmail.com ashleyfmonfort@gmail.com jessica.potter419@gmail.com grabenhorst@iclasspro.com jenna.michael98@gmail.com hfuller2@gmail.com snconti27@yahoo.com regina.rosen1989@gmail.com madisongongaware@gmail.com erwinthrop@gmail.com heatherscott@walnuthillpharmacy.com sjsekerke@gmail.com jamieloftis5@gmail.com cehsmith2@gmail.com smithle1030@gmail.com kimgregg4@gmail.com shannon_taylor27@yahoo.com capitalcoredance@gmail.com cchhdd16@yahoo.com jacq87@gmail.com kris10ad@gmail.com mollievandeusen@gmail.com cougotme@gmail.com tazashia.wilson@yahoo.com tinawlad@hotmail.com heathermachelleandrews@gmail.com allisonmm1995@yahoo.com angela@certifikid.com tuleftfeet@gmail.com avitablec@gmail.com monroerc@alumni.vcu.edu mariemoorehouse@usa.com caitlinbmullen@gmail.com morris.soraya@gmail.com aljewett@ymail.com splaersgirl@gmail.com mariannekoval@yahoo.com`
  .split(/\s+/).map(e => e.toLowerCase())
const existingEmails = new Set(profiles.map(p => (p.email ?? '').toLowerCase()))
const collisions = [...new Set(pdfEmails)].filter(e => existingEmails.has(e))
console.log('\n=== PDF GUARDIAN EMAILS ALREADY IN DB (would be UPDATED, not created) ===')
if (collisions.length === 0) console.log('  (none)')
for (const e of collisions) {
  const p = profiles.find(pp => (pp.email ?? '').toLowerCase() === e)
  console.log(`  ${e.padEnd(38)} -> ${`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()} [${p.role}]`)
}
console.log('')
