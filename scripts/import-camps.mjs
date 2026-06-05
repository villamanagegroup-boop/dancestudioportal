// Import the 8 themed Summer Camp 2026 weeks from the studio flyer into the
// portal `camps` table. All weeks: M–F 9:30 AM–3:30 PM, ages 4–13, $205 base
// (current-dancer full-week rate), cap 30, open + active.
//
// The flyer's non-studio +$20 fee and single/half-day tiers are NOT modeled by
// the camps schema (one price per camp; registrations are full-week), so only
// the base price is set here.
//
// DRY RUN by default. Pass --commit to write. Idempotent: a camp matched by
// name (case-insensitive) is updated in place, not duplicated.

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

const COMMON = {
  start_time: '09:30:00',
  end_time: '15:30:00',
  price: 205,
  max_capacity: 30,
  age_min: 4,
  age_max: 13,
  active: true,
  registration_open: true,
}

const CAMPS = [
  { name: 'Rainbow Remix', start_date: '2026-06-15', end_date: '2026-06-19',
    description: 'This colorful camp celebrates self-expression through vibrant dance styles, creative crafts, and music that encourages individuality and joy.' },
  { name: 'Glow Dance Party', start_date: '2026-06-22', end_date: '2026-06-26',
    description: 'A high-energy experience featuring neon crafts, upbeat choreography, and a glowing dance celebration that lights up the studio.' },
  { name: 'Pop Stars and Performers', start_date: '2026-06-29', end_date: '2026-07-03',
    description: 'Dancers step into the spotlight with high-energy routines, creative movement, and pop-inspired activities that build confidence and stage presence.' },
  { name: 'Around The World', start_date: '2026-07-06', end_date: '2026-07-10',
    description: 'Campers travel the globe through dance by exploring music, movement styles, and cultural rhythms from around the world.' },
  { name: 'Beach Bash Boogie', start_date: '2026-07-13', end_date: '2026-07-17',
    description: 'A fun, summer-vibe dance camp filled with upbeat routines, beach-themed crafts, and sunny, feel-good movement.' },
  { name: 'Movie Magic Dance Camp', start_date: '2026-07-20', end_date: '2026-07-24',
    description: 'Dancers bring the big screen to life with choreography inspired by favorite movie soundtracks and cinematic storytelling.' },
  { name: 'Dance & Dream Spirit Week', start_date: '2026-07-27', end_date: '2026-07-31',
    description: 'A confidence-building camp that blends expressive dance, positive affirmations, and creative activities focused on goal-setting and self-belief.' },
  { name: 'Princess and Heroes', start_date: '2026-08-03', end_date: '2026-08-07',
    description: 'Dancers bring fairytales to life through character-based movement, imaginative play, and story-driven choreography.' },
]

const { data: existing, error: exErr } = await supabase.from('camps').select('id, name')
if (exErr) { console.error('camps read:', exErr.message); process.exit(1) }
const byName = new Map(existing.map(c => [c.name.trim().toLowerCase(), c.id]))

let created = 0, updated = 0
for (const c of CAMPS) {
  const row = { ...COMMON, ...c }
  const id = byName.get(c.name.trim().toLowerCase())
  if (id) {
    if (COMMIT) {
      const { error } = await supabase.from('camps').update(row).eq('id', id)
      if (error) { console.error(`  ! update ${c.name}:`, error.message); continue }
    }
    updated++
    console.log(`  ~ ${c.name}  (${c.start_date}..${c.end_date}) — exists, ${COMMIT ? 'updated' : 'would update'}`)
  } else {
    if (COMMIT) {
      const { error } = await supabase.from('camps').insert(row)
      if (error) { console.error(`  ! create ${c.name}:`, error.message); continue }
    }
    created++
    console.log(`  + ${c.name}  (${c.start_date}..${c.end_date}) — ${COMMIT ? 'created' : 'would create'}`)
  }
}

console.log(`\n=== CAMP IMPORT ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`created: ${created} | updated: ${updated} | total in flyer: ${CAMPS.length}`)
console.log(`price $205 · cap 30 · ages 4–13 · M–F 09:30–15:30 · active + registration open`)
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
console.log('')
