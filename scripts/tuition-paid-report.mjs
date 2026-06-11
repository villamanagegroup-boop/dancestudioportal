// One-off: who has paid their May 2026 tuition?
// Joins checkout_links (slug like 'tuition-may2026-%') with checkout_payments
// to report paid vs unpaid families.

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

const { data: links, error: lErr } = await supabase
  .from('checkout_links')
  .select('id, slug, title, amount, recipient_name, recipient_email, active')
  .like('slug', 'tuition-may2026-%')
  .order('recipient_name', { ascending: true })
if (lErr) { console.error(lErr); process.exit(1) }

const ids = links.map(l => l.id)
const { data: payments, error: pErr } = await supabase
  .from('checkout_payments')
  .select('id, link_id, amount, status, created_at')
  .in('link_id', ids)
  .eq('status', 'paid')
if (pErr) { console.error(pErr); process.exit(1) }

const paidByLink = new Map()
for (const pay of payments) {
  const arr = paidByLink.get(pay.link_id) ?? []
  arr.push(pay)
  paidByLink.set(pay.link_id, arr)
}

const paid = []
const unpaid = []
for (const l of links) {
  const pays = paidByLink.get(l.id) ?? []
  if (pays.length > 0) {
    const total = pays.reduce((s, p) => s + Number(p.amount), 0)
    const latest = pays.map(p => p.created_at).sort().at(-1)
    paid.push({ ...l, totalPaid: total, payCount: pays.length, latest })
  } else {
    unpaid.push(l)
  }
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmt$ = (n) => `$${Number(n).toFixed(2)}`

console.log(`\n=== May 2026 Tuition Report (${links.length} total links) ===\n`)

console.log(`✅ PAID (${paid.length})`)
console.log(`-`.repeat(80))
for (const r of paid) {
  const owed = Number(r.amount ?? 0)
  const note = Math.abs(r.totalPaid - owed) < 0.01 ? '' : `  ⚠ paid ${fmt$(r.totalPaid)} vs invoiced ${fmt$(owed)}`
  console.log(`  ${r.recipient_name.padEnd(30)} ${fmt$(r.totalPaid).padStart(9)}  on ${fmtDate(r.latest)}${note}`)
}
const paidTotal = paid.reduce((s, r) => s + r.totalPaid, 0)
console.log(`  ${' '.repeat(30)} ${fmt$(paidTotal).padStart(9)}  (collected)\n`)

console.log(`❌ UNPAID (${unpaid.length})`)
console.log(`-`.repeat(80))
for (const r of unpaid) {
  const inactive = r.active ? '' : '  [INACTIVE LINK]'
  console.log(`  ${r.recipient_name.padEnd(30)} ${fmt$(r.amount ?? 0).padStart(9)}  ${r.recipient_email}${inactive}`)
}
const unpaidTotal = unpaid.reduce((s, r) => s + Number(r.amount ?? 0), 0)
console.log(`  ${' '.repeat(30)} ${fmt$(unpaidTotal).padStart(9)}  (outstanding)\n`)
