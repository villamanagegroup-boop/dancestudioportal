// 2026 Summer Session welcome email (v2 — attire + payment details + flyers).
// Recipients come from the WEBSITE registration JSON (the portal `profiles`
// table would miss 7 of 8 families who have no account). Spam removed, deduped.
// Usage:
//   node scripts/summer-session-welcome-blast.mjs   # send ONE test copy + PREVIEW the real list (no real sends)
//   node scripts/summer-session-welcome-blast.mjs --send   # deliver to all real recipients

import { Resend } from 'resend'
import { readFileSync } from 'node:fs'

// Flyers embedded inline at the bottom of the email (CID attachments).
const FLYERS = [
  { cid: 'summer-schedule', filename: 'summer classes.png', alt: 'Summer Dance Classes schedule', path: 'C:/Users/hicks/Downloads/ChatGPT Image Jun 16, 2026, 05_13_53 PM.png' },
  { cid: 'summer-flex-pass', filename: 'summer class pass.png', alt: 'Summer Flex All Class Pass', path: 'C:/Users/hicks/Downloads/ChatGPT Image Jun 16, 2026, 05_18_48 PM.png' },
]

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const TEST_TO = 'info@capitalcoredance.com'
const FROM = process.env.RESEND_FROM_EMAIL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '').replace(/^http:/, 'https:')
const STUDIO = process.env.NEXT_PUBLIC_STUDIO_NAME || 'Capital Core Dance Studio'

if (!FROM) { console.error('Missing RESEND_FROM_EMAIL'); process.exit(1) }
if (!process.env.RESEND_API_KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1) }

const subject = 'Welcome to Capital Core’s 2026 Summer Classes!'

const attire = (style, rows) =>
  `<h3 style="margin:16px 0 4px;color:#111;">${style}</h3>
   <ul style="margin:0 0 4px;padding-left:20px;line-height:1.6;">
   ${rows.map(r => `<li>${r}</li>`).join('')}
   </ul>`

const sched = (day, rows) =>
  `<h3 style="margin:18px 0 6px;color:#111;">${day}</h3>
   <ul style="margin:0 0 4px;padding-left:20px;line-height:1.6;">
   ${rows.map(r => `<li>${r}</li>`).join('')}
   </ul>`

const logo = APP_URL
  ? `<div style="text-align:center;padding:8px 0 4px;"><img src="${APP_URL}/logo.png" alt="${STUDIO}" width="72" height="72" style="width:72px;height:72px;object-fit:contain;" /></div>`
  : ''

const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px;margin:0 auto;font-size:15px;line-height:1.6;">
${logo}
<p>Hello Capital Core Dance Studio Families,</p>

<p><strong>Welcome to Summer Classes 2026!</strong></p>

<p>We are excited to dance with your family this summer. Our 6-week summer session begins the week of <strong>June 23, 2026</strong> and runs through <strong>July 30, 2026</strong>.</p>

<p>Whether your dancer is continuing their training or trying a new style, we’re looking forward to a fun and productive summer in the studio!</p>

<h2 style="margin:24px 0 4px;color:#111;">Summer Class Attire</h2>
<p>To help dancers feel prepared and confident, we recommend the following attire:</p>
${attire('Ballet', ['Leotard', 'Tights', 'Ballet slippers'])}
${attire('Tap', ['Leotard', 'Tights', 'Tap shoes'])}
${attire('Hip Hop', ['Activewear', 'Clean sneakers'])}
${attire('Tumble', ['Comfortable dancewear or athletic wear', 'Bare feet preferred'])}
${attire('Contemporary', ['Dancewear', 'Jazz shoes or bare feet'])}

<p>Please send your dancer with a water bottle each week and ensure long hair is secured away from the face.</p>

<h2 style="margin:24px 0 4px;color:#111;">Tuition &amp; Payments</h2>
<p>If you have already submitted a deposit, your spot is secured for the summer session.</p>
<p>To simplify our summer billing process, a secure PayPal payment link will be sent after the first week of classes. At that time, families may submit payment for the remainder of the summer session.</p>
<p>If your dancer is attending as a trial student, no additional action is needed right now. After the first class, simply let us know if your dancer would like to continue for the remainder of the session.</p>

<h2 style="margin:24px 0 4px;color:#111;">Summer Schedule</h2>
${sched('Tuesdays', [
  '5:30–6:00 PM | Tiny Ballet &amp; Tumble (Ages 2–3)',
  '6:00–7:00 PM | Beginner Ballet &amp; Hip Hop (Ages 5–7)',
  '7:00–7:45 PM | Tumble Techniques (Ages 6+)',
])}
${sched('Wednesdays', [
  '5:30–6:30 PM | Beginner Ballet &amp; Tap (Ages 5–7)',
  '6:30–7:15 PM | Hip Hop (Ages 5+)',
  '7:15–8:30 PM | Ballet &amp; Contemporary Technique (Ages 7+)',
])}
${sched('Thursdays', [
  '5:30–6:00 PM | Tiny Ballet &amp; Tumble (Ages 3–4)',
  '6:00–7:00 PM | Beginner Jazz &amp; Tumble (Ages 5–9)',
  '7:00–7:45 PM | TikTok Hip Hop Dance Workshop (Ages 6+)',
])}

<p style="margin-top:20px;">We can’t wait to spend the summer dancing, learning, and growing with your dancers!</p>

<p>If you have any questions before classes begin, please feel free to reach out.</p>

<p>See you in class!</p>

<p style="margin-top:24px;line-height:1.5;">
  <strong>Capital Core Dance Studio</strong><br>
  13110 Midlothian Turnpike<br>
  Midlothian, VA 23113<br>
  804-234-4014<br>
  <a href="mailto:info@capitalcoredancestudio.com">info@capitalcoredancestudio.com</a>
</p>

<div style="margin-top:28px;">
${FLYERS.map(f => `<img src="cid:${f.cid}" alt="${f.alt}" style="display:block;width:100%;max-width:640px;height:auto;margin:0 auto 16px;border-radius:8px;" />`).join('\n')}
</div>
</div>`

const attachments = FLYERS.map(f => ({
  filename: f.filename,
  content: readFileSync(f.path).toString('base64'),
  content_id: f.cid,
}))

const SEND = process.argv.includes('--send')
const norm = s => (s ?? '').trim().toLowerCase()

// Resolve real recipients from the website registration JSON (spam removed, deduped).
const reg = JSON.parse(readFileSync('C:/Users/hicks/Downloads/summer_class_registrations_rows.json', 'utf8'))
const recipients = []
const seen = new Set()
for (const r of reg) {
  if (!r.email || norm(r.email) === 'p@e.com') continue // skip spam / blank
  const key = norm(r.email)
  if (seen.has(key)) continue
  seen.add(key)
  recipients.push({ email: r.email.trim(), name: r.parent_name?.trim() ?? '' })
}

const resend = new Resend(process.env.RESEND_API_KEY)

if (!SEND) {
  console.log(`\n[preview] Sending ONE test copy to ${TEST_TO} (from ${FROM}) ...`)
  const { data, error } = await resend.emails.send({ from: FROM, to: TEST_TO, subject, html, attachments })
  if (error) { console.error('Test send failed:', error); process.exit(1) }
  console.log(`Test sent. id=${data?.id ?? '(no id)'}`)
  console.log(`\nReal recipients that WOULD receive the blast (run again with --send): ${recipients.length}`)
  for (const r of recipients) console.log(`  - ${r.name.padEnd(22)} <${r.email}>`)
  console.log('\nNo real emails were sent. Re-run with --send to deliver.')
  process.exit(0)
}

console.log(`\n[send] Delivering to ${recipients.length} recipient(s) ...`)
let ok = 0, fail = 0
for (const r of recipients) {
  try {
    const { error } = await resend.emails.send({ from: FROM, to: r.email, subject, html, attachments })
    if (error) { console.error(`  fail ${r.email}: ${error.message ?? error}`); fail++ }
    else { console.log(`  ok   ${r.email}`); ok++ }
  } catch (e) {
    console.error(`  fail ${r.email}: ${e?.message ?? e}`); fail++
  }
}
console.log(`\nDone. ok=${ok} fail=${fail} total=${recipients.length}`)
