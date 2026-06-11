// One-off: Memorial Day "no class today" email blast.
// Usage:
//   node scripts/memorial-day-blast.mjs              # preview-only: emails info@capitalcoredance.com, lists recipients
//   node scripts/memorial-day-blast.mjs --send       # actually send to the resolved recipient list

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { readFileSync } from 'node:fs'

// Load .env.local manually (no dotenv dep in this project)
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const SEND = process.argv.includes('--send')
const PREVIEW_TO = 'info@capitalcoredance.com'
const FROM = process.env.RESEND_FROM_EMAIL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '').replace(/^http:/, 'https:')
const STUDIO = process.env.NEXT_PUBLIC_STUDIO_NAME || 'Capital Core Dance Studio'

if (!FROM) { console.error('Missing RESEND_FROM_EMAIL'); process.exit(1) }
if (!process.env.RESEND_API_KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1) }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const subject = 'No class today — Memorial Day'
const body =
  `Hi everyone,\n\n` +
  `Just a friendly reminder that ${STUDIO} is closed today, Monday May 25, in observance of Memorial Day. ` +
  `There will be no classes.\n\n` +
  `We'll see you back at the studio tomorrow!\n\n` +
  `— The Capital Core Dance team`

const logo = APP_URL
  ? `<div style="text-align:center;padding:8px 0 4px;"><img src="${APP_URL}/logo.png" alt="${STUDIO}" width="72" height="72" style="width:72px;height:72px;object-fit:contain;" /></div>`
  : ''
const html = `${logo}
  <h2>${subject}</h2>
  <div>${body.replace(/\n/g, '<br>')}</div>
  <p>— ${STUDIO}</p>`

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: parents, error } = await supabase
  .from('profiles')
  .select('id, email, first_name, last_name')
  .eq('role', 'parent')
if (error) { console.error('Supabase error:', error.message); process.exit(1) }

const seen = new Set()
const excluded = []
const recipients = []
for (const p of parents ?? []) {
  if (!p.email) continue
  const fn = (p.first_name || '').trim().toLowerCase()
  const ln = (p.last_name || '').trim().toLowerCase()
  // Exclude Yamamah Dark (match either name token to be safe)
  if (fn.includes('yamamah') || ln.includes('yamamah') || fn.includes('dark') || ln.includes('dark')) {
    excluded.push(`${p.first_name ?? ''} ${p.last_name ?? ''} <${p.email}>`)
    continue
  }
  const key = p.email.toLowerCase()
  if (seen.has(key)) continue
  seen.add(key)
  recipients.push({ email: p.email, name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() })
}

console.log(`\nResolved ${recipients.length} parent recipient(s).`)
console.log(`Excluded ${excluded.length} for Yamamah/Dark match:`)
for (const e of excluded) console.log(`  - ${e}`)

if (!SEND) {
  console.log(`\n[preview] Sending ONE preview to ${PREVIEW_TO} ...`)
  const { data, error } = await resend.emails.send({ from: FROM, to: PREVIEW_TO, subject, html })
  if (error) { console.error('Preview send failed:', error); process.exit(1) }
  console.log(`Preview sent. id=${data?.id ?? '(no id)'}.`)
  console.log(`\nRecipients that WOULD receive the real blast (run again with --send to deliver):`)
  for (const r of recipients) console.log(`  - ${r.name} <${r.email}>`)
  process.exit(0)
}

console.log(`\n[send] Sending to ${recipients.length} recipient(s) ...`)
let ok = 0, fail = 0
for (const r of recipients) {
  try {
    const { error } = await resend.emails.send({ from: FROM, to: r.email, subject, html })
    if (error) { console.error(`  fail ${r.email}: ${error.message ?? error}`); fail++ }
    else { ok++ }
  } catch (e) {
    console.error(`  fail ${r.email}: ${e?.message ?? e}`); fail++
  }
}
console.log(`\nDone. ok=${ok} fail=${fail} total=${recipients.length}`)
