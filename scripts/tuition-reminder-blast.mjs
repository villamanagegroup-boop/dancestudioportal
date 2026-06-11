// One-off: May 2026 tuition reminder ("we'll auto-charge at 12pm today").
// Usage:
//   node scripts/tuition-reminder-blast.mjs            # preview-only: sends ONE email to info@capitalcoredance.com
//   node scripts/tuition-reminder-blast.mjs --send     # actually sends to every unpaid family (Mandi Glidewell excluded by policy)
//
// Resolves recipients from checkout_links (slug like 'tuition-may2026-%', active=true,
// no matching paid checkout_payments). Skips Mandi Glidewell — she is a staff parent.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { readFileSync } from 'node:fs'

const signatureBuffer = readFileSync(new URL('../public/chanel-signature.png', import.meta.url))

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const SEND = process.argv.includes('--send')
const onlyEmailsArg = process.argv.find(a => a.startsWith('--only-emails='))
const ONLY_EMAILS = onlyEmailsArg
  ? new Set(onlyEmailsArg.slice('--only-emails='.length).split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
  : null
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const PREVIEW_TO = 'info@capitalcoredance.com'
const FROM = process.env.RESEND_FROM_EMAIL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '').replace(/^http:/, 'https:')
const STUDIO = process.env.NEXT_PUBLIC_STUDIO_NAME || 'Capital Core Dance Studio'

if (!FROM) { console.error('Missing RESEND_FROM_EMAIL'); process.exit(1) }
if (!process.env.RESEND_API_KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1) }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!APP_URL) { console.error('Missing NEXT_PUBLIC_APP_URL — needed for /pay/ links and signature image'); process.exit(1) }

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: links, error: lErr } = await supabase
  .from('checkout_links')
  .select('id, slug, title, amount, recipient_name, recipient_email, active')
  .like('slug', 'tuition-may2026-%')
  .eq('active', true)
  .not('recipient_email', 'is', null)
if (lErr) { console.error(lErr); process.exit(1) }

const { data: payments } = await supabase
  .from('checkout_payments')
  .select('link_id')
  .eq('status', 'paid')
  .not('link_id', 'is', null)
const paidLinkIds = new Set((payments ?? []).map(p => p.link_id))

const unpaid = links
  .filter(l => !paidLinkIds.has(l.id))
  // Memory: skip-mandi-glidewell-payments — staff parent, comped tuition.
  .filter(l => {
    const name = (l.recipient_name || '').toLowerCase()
    return !(name.includes('mandi') && name.includes('glidewell'))
  })
  .filter(l => ONLY_EMAILS ? ONLY_EMAILS.has((l.recipient_email || '').toLowerCase()) : true)

function emailHtml({ guardianName, amount, payUrl }) {
  const firstName = (guardianName || 'there').split(/\s+/)[0]
  const amt = Number(amount).toFixed(2)
  const logo = `<div style="text-align:center;padding:8px 0 4px;"><img src="${APP_URL}/logo.png" alt="${STUDIO}" width="72" height="72" style="width:72px;height:72px;object-fit:contain;" /></div>`
  return `${logo}
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <h2 style="color:#111;margin:0 0 12px;">Reminder: May 2026 tuition</h2>
    <p>Hi ${firstName},</p>
    <p>Just a quick heads-up that your <strong>May 2026 tuition balance of $${amt}</strong> is still outstanding.</p>
    <p>If you'd like to handle it yourself, you can pay securely with the PayPal link below:</p>
    <p style="margin:20px 0;">
      <a href="${payUrl}" style="display:inline-block;background:#2dd4bf;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">
        Pay $${amt} →
      </a>
    </p>
    <p>Otherwise, <strong>no action is needed</strong> — we'll be processing the charges manually through iClassPro today, <strong>Tuesday, May 26 at 12:00 PM</strong>.</p>
    <p>Thanks for being part of the Capital Core family — have a wonderful holiday weekend!</p>
    <p style="color:#666;font-size:12px;">If the button doesn't work, paste this link into your browser:<br>${payUrl}</p>
    <div style="margin-top:28px;">
      <img src="cid:chanel-signature" alt="Chanel W.M. Hicks — Capital Core Dance Studio and Challenge" style="display:block;max-width:260px;height:auto;" />
    </div>
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;">
      This is an automated message from ${STUDIO}.
      <div style="margin-top:10px;">
        <a href="${APP_URL}/portal/account?manage=communications" style="display:inline-block;color:#6b7280;text-decoration:none;border:1px solid #e5e7eb;padding:7px 16px;border-radius:6px;font-size:11px;font-weight:600;">
          Opt out
        </a>
      </div>
    </div>
  </div>`
}

const subject = 'Reminder: May 2026 tuition — we’ll auto-charge at 12pm today'

console.log(`\nUnpaid May 2026 tuition recipients: ${unpaid.length}`)
for (const l of unpaid) console.log(`  - ${l.recipient_name} <${l.recipient_email}>  $${Number(l.amount).toFixed(2)}`)

if (!SEND) {
  // Use the first real recipient's amount + link in the preview so info@ sees realistic content.
  const sample = unpaid[0]
  if (!sample) { console.error('\nNo unpaid recipients to preview.'); process.exit(0) }
  const payUrl = `${APP_URL}/pay/${sample.slug}`
  const html = emailHtml({ guardianName: sample.recipient_name, amount: sample.amount, payUrl })
  console.log(`\n[preview] Sending ONE preview to ${PREVIEW_TO} using ${sample.recipient_name}'s amount/link ...`)
  const { data, error } = await resend.emails.send({
    from: FROM, to: PREVIEW_TO, subject, html,
    attachments: [{ filename: 'chanel-signature.png', content: signatureBuffer, contentId: 'chanel-signature' }],
  })
  if (error) { console.error('Preview send failed:', error); process.exit(1) }
  console.log(`Preview sent. id=${data?.id ?? '(no id)'}`)
  console.log(`\nRe-run with --send to deliver to all ${unpaid.length} unpaid recipients.`)
  process.exit(0)
}

console.log(`\n[send] Sending to ${unpaid.length} recipient(s) (throttled to 4/sec) ...`)
let ok = 0, fail = 0
for (let i = 0; i < unpaid.length; i++) {
  const l = unpaid[i]
  const payUrl = `${APP_URL}/pay/${l.slug}`
  const html = emailHtml({ guardianName: l.recipient_name, amount: l.amount, payUrl })
  try {
    const { error } = await resend.emails.send({
      from: FROM, to: l.recipient_email, subject, html,
      attachments: [{ filename: 'chanel-signature.png', content: signatureBuffer, contentId: 'chanel-signature' }],
    })
    if (error) { console.error(`  fail ${l.recipient_email}: ${error.message ?? error}`); fail++ }
    else { ok++; console.log(`  ok   ${l.recipient_email}`) }
  } catch (e) {
    console.error(`  fail ${l.recipient_email}: ${e?.message ?? e}`); fail++
  }
  if (i < unpaid.length - 1) await sleep(250)  // stay under Resend's 5/sec cap
}
console.log(`\nDone. ok=${ok} fail=${fail} total=${unpaid.length}`)
