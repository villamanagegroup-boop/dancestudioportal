// Seed the email_subscribers mailing list from everyone currently in the portal.
// ------------------------------------------------------------------
// Sources (deduped, case-insensitive, junk removed):
//   • profiles            — every account with an email (parents + staff)
//   • site_intake         — every public-site form submitter email
//
// Existing rows are left untouched (so an unsubscribed/archived contact is
// never silently re-subscribed); only brand-new emails are inserted as
// status='subscribed'. The 500+ off-portal contacts come later via
// import-subscribers.mjs.
//
// Usage (run from repo root):
//   node scripts/email-list/seed-subscribers.mjs            # preview only
//   node scripts/email-list/seed-subscribers.mjs --commit   # write new rows
import { loadEnv } from '../lib/mailer.mjs'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../lib/unsub.mjs'

const COMMIT = process.argv.includes('--commit')
const JUNK = new Set(['p@e.com'])

const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Gather candidate contacts.
const candidates = new Map() // normalizedEmail -> { email, name, profile_id, source }
function add(email, name, profile_id, source) {
  const key = normalizeEmail(email)
  if (!key || JUNK.has(key) || !key.includes('@')) return
  if (!candidates.has(key)) candidates.set(key, { email: email.trim(), name: name ?? '', profile_id: profile_id ?? null, source })
  else if (profile_id && !candidates.get(key).profile_id) candidates.get(key).profile_id = profile_id
}

const { data: profiles } = await sb.from('profiles').select('id, email, first_name, last_name')
for (const p of profiles ?? []) add(p.email, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), p.id, 'seed:profile')

const { data: intake } = await sb.from('site_intake').select('submitter_email, submitter_name')
for (const r of intake ?? []) add(r.submitter_email, r.submitter_name, null, 'seed:site_intake')

// Existing list rows (any status) — never touch these.
const { data: existing } = await sb.from('email_subscribers').select('email, status')
const existingByEmail = new Map((existing ?? []).map((r) => [normalizeEmail(r.email), r.status]))

const toInsert = []
const alreadyOnList = []
for (const [key, c] of candidates) {
  if (existingByEmail.has(key)) { alreadyOnList.push({ ...c, status: existingByEmail.get(key) }); continue }
  toInsert.push({ email: c.email, name: c.name || null, status: 'subscribed', source: c.source, profile_id: c.profile_id })
}

console.log(`\n=== SEED email_subscribers ===`)
console.log(`  candidates found:        ${candidates.size}`)
console.log(`  already on list:         ${alreadyOnList.length}`)
console.log(`  NEW to insert:           ${toInsert.length}`)
const suppressedOnList = alreadyOnList.filter((r) => r.status !== 'subscribed')
if (suppressedOnList.length) {
  console.log(`  (of those, opted-out/archived — left as-is: ${suppressedOnList.length})`)
  for (const r of suppressedOnList) console.log(`     ${r.status.padEnd(12)} ${r.email}`)
}
console.log('\n  new emails:')
for (const r of toInsert) console.log(`     + ${(r.name || '').padEnd(24)} ${r.email}`)

if (!COMMIT) {
  console.log(`\n  DRY RUN — re-run with --commit to insert ${toInsert.length} rows.\n`)
  process.exit(0)
}

if (toInsert.length) {
  const { error } = await sb.from('email_subscribers').insert(toInsert)
  if (error) { console.error('insert failed:', error.message); process.exit(1) }
}
console.log(`\n  ✅ inserted ${toInsert.length} new subscribers.\n`)
