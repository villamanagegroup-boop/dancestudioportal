// Import off-portal contacts (the 500+ on file) into the email_subscribers list.
// ------------------------------------------------------------------
// Accepts a CSV or JSON file. CSV must have a header row with at least an
// `email` column; an optional `name` (or `first_name`+`last_name`) column is
// used for the display name. JSON must be an array of objects with the same
// keys. Emails are deduped case-insensitively; rows already on the list are
// left untouched (an unsubscribed contact is never re-subscribed by import).
//
// Usage (run from repo root):
//   node scripts/email-list/import-subscribers.mjs <file>            # preview
//   node scripts/email-list/import-subscribers.mjs <file> --commit   # write
import { loadEnv } from '../lib/mailer.mjs'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../lib/unsub.mjs'
import { readFileSync } from 'node:fs'

const file = process.argv.find((a) => !a.startsWith('--') && /\.(csv|json)$/i.test(a))
const COMMIT = process.argv.includes('--commit')
if (!file) { console.error('Usage: node scripts/email-list/import-subscribers.mjs <file.csv|file.json> [--commit]'); process.exit(1) }

const JUNK = new Set(['p@e.com'])
const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// --- Parse file into [{ email, name }] ---
function parseCsvLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const raw = readFileSync(file, 'utf8')
let records = []
if (file.toLowerCase().endsWith('.json')) {
  records = JSON.parse(raw)
} else {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const row = {}
    header.forEach((h, i) => { row[h] = cells[i] ?? '' })
    records.push(row)
  }
}

const candidates = new Map()
for (const r of records) {
  const email = r.email || r.Email || r.EMAIL || ''
  const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || ''
  const key = normalizeEmail(email)
  if (!key || JUNK.has(key) || !key.includes('@')) continue
  if (!candidates.has(key)) candidates.set(key, { email: String(email).trim(), name: String(name).trim() })
}

const { data: existing } = await sb.from('email_subscribers').select('email, status')
const existingByEmail = new Map((existing ?? []).map((r) => [normalizeEmail(r.email), r.status]))

const toInsert = []
let skipped = 0
for (const [key, c] of candidates) {
  if (existingByEmail.has(key)) { skipped++; continue }
  toInsert.push({ email: c.email, name: c.name || null, status: 'subscribed', source: 'import' })
}

console.log(`\n=== IMPORT ${file} ===`)
console.log(`  parsed rows:        ${records.length}`)
console.log(`  unique emails:      ${candidates.size}`)
console.log(`  already on list:    ${skipped}`)
console.log(`  NEW to insert:      ${toInsert.length}`)

if (!COMMIT) {
  for (const r of toInsert.slice(0, 25)) console.log(`     + ${(r.name || '').padEnd(24)} ${r.email}`)
  if (toInsert.length > 25) console.log(`     … and ${toInsert.length - 25} more`)
  console.log(`\n  DRY RUN — re-run with --commit to insert ${toInsert.length} rows.\n`)
  process.exit(0)
}

if (toInsert.length) {
  // Insert in chunks to stay well under payload limits.
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500)
    const { error } = await sb.from('email_subscribers').insert(chunk)
    if (error) { console.error('insert failed:', error.message); process.exit(1) }
    console.log(`  inserted ${Math.min(i + 500, toInsert.length)}/${toInsert.length}`)
  }
}
console.log(`\n  ✅ imported ${toInsert.length} new subscribers.\n`)
