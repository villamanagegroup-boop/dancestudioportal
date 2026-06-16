// Adult Summer Flow Series announcement — Fridays 6:00–7:30 PM, all 3 styles
// in one 90-min class. Recipients are the adult interest-list submitters
// (adult_series_interest_rows.csv), deduped, blank/duplicate rows removed.
// Usage:
//   node scripts/adult-series-announce-blast.mjs          # test copy + PREVIEW real list (no real sends)
//   node scripts/adult-series-announce-blast.mjs --send   # deliver to all real recipients

import { Resend } from 'resend'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const SEND = process.argv.includes('--send')
const TEST_TO = 'info@capitalcoredance.com'
const FROM = process.env.RESEND_FROM_EMAIL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '').replace(/^http:/, 'https:')
const STUDIO = process.env.NEXT_PUBLIC_STUDIO_NAME || 'Capital Core Dance Studio'

if (!FROM) { console.error('Missing RESEND_FROM_EMAIL'); process.exit(1) }
if (!process.env.RESEND_API_KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1) }

// Interest-list recipients (from adult_series_interest_rows.csv).
// Lauren Vogt's blank duplicate (lauren.m.vogt@gmail.co) is dropped.
const recipients = [
  { name: 'Winona Morrow-Wasson', email: 'Wackospacer@yahoo.com' },
  { name: 'Wendy Pirovolos',      email: 'wpirovolos@gmail.com' },
  { name: 'Lauren Vogt',          email: 'lauren.m.vogt@gmail.com' },
  { name: 'Abby Schwartzlow',     email: 'massagebyabby@live.com' },
  { name: 'Savannah Durrbeck',    email: 'littlebitalexis03@gmail.com' },
  { name: 'Christine Borges',     email: 'cborges24@gmail.com' },
  { name: 'Kellye Logwood',       email: 'kellye.logwood@sbcglobal.net' },
  { name: 'Sabena Blakeney',      email: 'suddowla@yahoo.com' },
  { name: 'La-Tesha',             email: 'loveollison@yahoo.com' },
]

const subject = 'It’s happening! Adult Friday Flow Series — all 3 styles in one class'

// ---- PLACEHOLDERS — confirm before the real send ----
const START_LINE = 'Starting Friday, [START DATE]'
const PRICING_LINE = '[Drop-in $__ · Full series $__ — full pricing below]'

const seg = (time, title, mins, desc) =>
  `<tr>
     <td style="padding:8px 12px 8px 0;white-space:nowrap;font-weight:bold;color:#c2185b;vertical-align:top;">${time}</td>
     <td style="padding:8px 0;color:#222;"><strong>${title}</strong> <span style="color:#666;">(${mins})</span><br><span style="color:#444;font-size:14px;">${desc}</span></td>
   </tr>`

const logo = APP_URL
  ? `<div style="text-align:center;padding:8px 0 4px;"><img src="${APP_URL}/logo.png" alt="${STUDIO}" width="72" height="72" style="width:72px;height:72px;object-fit:contain;" /></div>`
  : ''

const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px;margin:0 auto;font-size:15px;line-height:1.6;">
${logo}
<p>Hi there,</p>

<p>You raised your hand for our <strong>Adult Summer Flow Series</strong> — and it’s officially happening! Thank you for your interest. We listened to what you asked for, and we built one feel-good Friday-night class that brings together <strong>all three styles in a single 90-minute session.</strong></p>

<h2 style="margin:22px 0 6px;color:#111;">Adult Friday Flow Series</h2>
<p style="margin:0 0 2px;font-size:17px;"><strong>Fridays · 6:00–7:30 PM</strong></p>
<p style="margin:0 0 14px;color:#555;">${START_LINE} &middot; ${PRICING_LINE}</p>

<table style="border-collapse:collapse;width:100%;margin:6px 0 8px;">
${seg('6:00–6:45', 'THROWBACK Flow', '45 min', 'High-energy, feel-good choreography set to throwback hits. The main event — fun, sweaty, and easy to follow.')}
${seg('6:45–7:15', 'FEMME Flow', '30 min', 'Expressive, confidence-building movement that celebrates your style and lets you perform.')}
${seg('7:15–7:30', 'CALM Confidence', '15 min', 'A slower, grounding cool-down — stretch, breath, and centering to close the night.')}
</table>

<p style="color:#444;"><em>All levels welcome — no dance experience required.</em> These are choreography-based flow classes for adults (a blend of jazz, lyrical, and modern movement), designed to be approachable, expressive, and a great workout. Come as you are and move at your own pace.</p>

<h3 style="margin:20px 0 4px;color:#111;">What to bring</h3>
<ul style="margin:0;padding-left:20px;line-height:1.6;">
  <li>Comfortable activewear you can move in</li>
  <li>Sneakers or bare feet (whatever feels good)</li>
  <li>A water bottle</li>
</ul>

<h3 style="margin:20px 0 4px;color:#111;">Want in?</h3>
<p>Whether you’re joining for the full series or dropping in for a night, we’d love to have you. [REGISTRATION / REPLY INSTRUCTIONS HERE] — just reply to this email to grab your spot or ask any questions.</p>

<p style="margin-top:18px;">We can’t wait to dance with you on Friday nights this summer!</p>
<p>See you in the studio,</p>

<p style="margin-top:20px;line-height:1.5;">
  <strong>Capital Core Dance Studio</strong><br>
  13110 Midlothian Turnpike<br>
  Midlothian, VA 23113<br>
  804-234-4014<br>
  <a href="mailto:info@capitalcoredancestudio.com">info@capitalcoredancestudio.com</a>
</p>
</div>`

const resend = new Resend(process.env.RESEND_API_KEY)

if (!SEND) {
  console.log(`[preview] Sending ONE test copy to ${TEST_TO} (from ${FROM}) ...`)
  const { data, error } = await resend.emails.send({ from: FROM, to: TEST_TO, subject, html })
  if (error) { console.error('Test send failed:', error); process.exit(1) }
  console.log(`Test sent. id=${data?.id ?? '(no id)'}`)
  console.log(`\nReal recipients that WOULD receive the blast (run again with --send): ${recipients.length}`)
  for (const r of recipients) console.log(`  - ${r.name.padEnd(22)} <${r.email}>`)
  console.log('\nNo real emails were sent. Re-run with --send to deliver.')
} else {
  console.log(`[send] Delivering to ${recipients.length} recipient(s) ...`)
  let ok = 0, fail = 0
  for (const r of recipients) {
    try {
      const { error } = await resend.emails.send({ from: FROM, to: r.email, subject, html })
      if (error) { console.error(`  fail ${r.email}: ${error.message ?? error}`); fail++ }
      else { console.log(`  ok   ${r.email}`); ok++ }
    } catch (e) {
      console.error(`  fail ${r.email}: ${e?.message ?? e}`); fail++
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail} total=${recipients.length}`)
}
