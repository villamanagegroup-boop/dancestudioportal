// One-off: deactivate all May 2026 tuition pay links.
// Reason: Chanel is processing the outstanding charges manually through iClassPro,
// so the PayPal pages should be turned off to avoid double-payment.
// Reversible: each link still exists; set active=true to re-enable.

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

const { data: before, error: lErr } = await supabase
  .from('checkout_links')
  .select('id, slug, recipient_name, active')
  .like('slug', 'tuition-may2026-%')
  .eq('active', true)
if (lErr) { console.error(lErr); process.exit(1) }

console.log(`Found ${before.length} active May 2026 tuition link(s).`)
for (const l of before) console.log(`  - ${l.recipient_name}  (${l.slug})`)

if (before.length === 0) { console.log('Nothing to do.'); process.exit(0) }

const { error: uErr, count } = await supabase
  .from('checkout_links')
  .update({ active: false }, { count: 'exact' })
  .like('slug', 'tuition-may2026-%')
  .eq('active', true)
if (uErr) { console.error(uErr); process.exit(1) }

console.log(`\nDeactivated ${count} link(s).`)
console.log(`To re-enable later, flip active=true on the same slugs (or use the Disable/Enable toggle on /checkout).`)
