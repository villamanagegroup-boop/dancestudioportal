// ============================================================
// Week 3: Pop Stars & Performers — camp welcome email.
// Built from Chanel's exact copy (2026-06-28), styled to match the
// reusable Glow Week sender. Reuses the same roster/dedup/Resend logic.
//
//   MODE='test' -> only TEST_TO (preview).  MODE='live' -> whole roster + EXTRA.
//   Run from repo root so .env.local resolves:
//     node scripts/camp-emails/send-popstar-week.mjs
//   Needs RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY.
// ============================================================

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------- CONFIG
const CONFIG = {
  MODE: 'test',                       // 'test' = only TEST_TO  |  'live' = whole roster + EXTRA  (SENT LIVE 2026-06-28: 6/6)
  TEST_TO: 'hicksch7@gmail.com',
  EXCLUDE: [],                        // emails to skip in live mode

  // Pop Star registrations that are NOT in the portal DB roster, so include
  // their guardians explicitly. Auto-skipped if the roster ever already
  // contains one of these addresses.
  EXTRA: [
    'dpliving@gmail.com',        // Devin Livingston (Mira Livingston) — added by Chanel
    'collins.leslie@gmail.com',  // Leslie Rennolds (Louise Rennolds) — website signup 2026-06-26, deposit only
  ],

  CAMP_ID: '7c052eed-3000-4afa-8a0c-a041fa6faba2',  // Pop Stars and Performers (Jun 29 – Jul 3)
  STATUSES: ['registered'],

  SUBJECT: '🎤 Pop Stars & Performers Week Starts Monday! (Week 3: June 29 – July 3)',
  PAYPAL_LINK: 'https://www.paypal.com/ncp/payment/8JPXEP2ENA9XG',

  FLYER_PATH: 'C:/Users/hicks/Downloads/ChatGPT Image Jun 28, 2026, 12_03_34 PM.png',
  LOGO_PATH: 'C:/Users/hicks/Downloads/Images/capital core dance challenge (21).png',
}
// --------------------------------------------------------------------------

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
  }),
)
const KEY = env.RESEND_API_KEY
const FROM = `Capital Core Dance <${env.RESEND_FROM_EMAIL}>`

function buildHtml(c, flyerCid, logoCid) {
  const PAY = c.PAYPAL_LINK
  return `
<div style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b3a;line-height:1.55;">
  <p style="font-size:17px;margin:0 0 12px;">Hello Camp Families,</p>
  <p style="margin:0 0 16px;">We are so excited to welcome your camper to <strong>Week 3: Pop Stars &amp; Performers</strong> at Capital Core Dance! 🎤⭐💖</p>
  <img src="cid:${flyerCid}" alt="Pop Star Week" width="560" style="width:100%;max-width:560px;height:auto;border-radius:14px;margin:8px 0 20px;display:block;border:1px solid #eee;" />
  <p style="margin:0 0 16px;">This week is all about confidence, creativity, and having fun in the spotlight. Campers will spend the week learning exciting choreography, playing themed games, creating fun crafts, participating in team activities, and preparing for our end-of-week showcase. We can't wait to see everyone's inner superstar shine!</p>

  <h2 style="font-size:18px;color:#6d28d9;margin:24px 0 8px;">Camp Times</h2>
  <p style="margin:0 0 4px;">☀️ <strong>Full Day:</strong> 9:30 AM – 3:30 PM</p>
  <p style="margin:0 0 4px;">🌤️ <strong>Half Day:</strong> 9:30 AM – 12:30 PM</p>
  <p style="margin:0 0 4px;">🚪 <strong>Aftercare:</strong> 3:30 PM – 4:30 PM (Pick-up by 4:30 PM)</p>

  <h2 style="font-size:18px;color:#db2777;margin:24px 0 8px;">What to Bring</h2>
  <ul style="margin:0 0 8px;padding-left:20px;">
    <li>Water bottle</li>
    <li>Two snacks</li>
    <li>Lunch (Full-Day Campers Only)</li>
    <li>Comfortable clothing or dancewear</li>
    <li>Dance shoes or sneakers</li>
    <li>A positive attitude and lots of energy!</li>
  </ul>

  <h2 style="font-size:18px;color:#c026d3;margin:24px 0 8px;">Friday Showcase</h2>
  <p style="margin:0 0 10px;">Family and friends are invited to join us on <strong>Friday at 3:20 PM</strong> for our end-of-week mini performance. Our campers love showing off everything they've learned throughout the week, and we hope you'll be there to cheer them on!</p>

  <h2 style="font-size:18px;color:#ea580c;margin:24px 0 8px;">Pizza Party Friday 🍕</h2>
  <p style="margin:0 0 10px;">We'll also celebrate another successful week with a <strong>pizza party for lunch on Friday!</strong> Campers are welcome to participate or bring their own lunch if they prefer.</p>

  <h2 style="font-size:18px;color:#16a34a;margin:24px 0 8px;">Payments</h2>
  <p style="margin:0 0 12px;">If you still have a remaining camp balance, please submit payment before camp begins. If you need a reminder of your balance, simply reply to this email and we'll be happy to help.</p>
  <p style="text-align:center;margin:0 0 8px;">
    <a href="${PAY}" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 34px;border-radius:999px;">Pay Camp Balance</a>
  </p>
  <p style="text-align:center;font-size:12px;color:#888;margin:0 0 8px;">or copy this link: <a href="${PAY}" style="color:#db2777;">${PAY}</a></p>

  <h2 style="font-size:18px;color:#dc2626;margin:24px 0 8px;">Medical Information</h2>
  <p style="margin:0 0 10px;">If you have not already done so, please let us know about any food allergies, medical conditions, medications, or other information our staff should be aware of to help keep your camper safe throughout the week.</p>

  <p style="margin:18px 0 0;">We are looking forward to another amazing week of dancing, games, creativity, and making memories. Thank you for choosing Capital Core Dance for your summer adventures—we'll see your superstar soon!</p>
  <p style="margin:14px 0 0;">Warmly,</p>

  <div style="margin:24px 0 0;padding-top:16px;border-top:2px solid #eee;font-size:14px;color:#444;">
    <p style="margin:0;font-weight:700;color:#1e1b4b;">Chanel Hicks – Gray</p>
    <p style="margin:1px 0 0;">Owner &amp; Director</p>
    <p style="margin:1px 0 0;font-weight:700;color:#1e1b4b;">Capital Core Dance Studio</p>
    <p style="margin:1px 0 0;">13110 Midlothian Turnpike</p>
    <p style="margin:1px 0 0;">Midlothian, VA 23113</p>
    <p style="margin:1px 0 0;">804-234-4014</p>
    <p style="margin:1px 0 0;"><a href="mailto:info@capitalcoredancestudio.com" style="color:#6d28d9;">info@capitalcoredancestudio.com</a></p>
    <img src="cid:${logoCid}" alt="Capital Core Dance Studio" width="120" style="width:120px;height:auto;display:block;margin:12px 0 0;" />
  </div>
  <p style="margin:18px 0 0;font-size:13px;color:#777;font-style:italic;">P.S. Get ready to shine like a pop star! ⭐🎤💖</p>
</div>
</div>`
}

async function getRoster(c) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: regs } = await sb.from('camp_registrations')
    .select('status, student:students(id, first_name, last_name)')
    .eq('camp_id', c.CAMP_ID).in('status', c.STATUSES)
  const emails = new Map()
  for (const r of regs ?? []) {
    const sid = r.student?.id
    if (!sid) continue
    const { data: gs } = await sb.from('guardian_students')
      .select('is_primary, guardian:profiles(first_name, last_name, email)')
      .eq('student_id', sid)
    const list = (gs ?? []).filter(g => g.guardian?.email)
    const pick = list.find(g => g.is_primary) || list[0]
    if (!pick) continue
    const email = pick.guardian.email
    const camper = `${r.student.first_name ?? ''} ${r.student.last_name ?? ''}`.trim()
    if (!emails.has(email)) emails.set(email, { name: `${pick.guardian.first_name ?? ''} ${pick.guardian.last_name ?? ''}`.trim(), campers: [] })
    emails.get(email).campers.push(camper)
  }
  return emails
}

async function main() {
  const c = CONFIG
  const flyerB64 = readFileSync(c.FLYER_PATH).toString('base64')
  const logoB64 = readFileSync(c.LOGO_PATH).toString('base64')
  const html = buildHtml(c, 'flyer', 'logo')
  const attachments = [
    { filename: 'Pop-Star-Week.png', content: flyerB64, content_id: 'flyer' },
    { filename: 'Pop-Star-Week.png', content: flyerB64 },
    { filename: 'capital-core-dance-logo.png', content: logoB64, content_id: 'logo' },
  ]

  let recipients
  if (c.MODE === 'live') {
    const roster = await getRoster(c)
    const base = [...roster.keys()].filter(e => !c.EXCLUDE.includes(e))
    const extra = c.EXTRA.filter(e => !roster.has(e) && !c.EXCLUDE.includes(e))
    recipients = [...base, ...extra]
    console.log(`LIVE — ${recipients.length} households for Pop Stars & Performers Week:`)
    for (const [email, info] of roster) console.log(`  ${c.EXCLUDE.includes(email) ? 'SKIP' : 'send'}  ${email}  (${info.name}) — ${info.campers.join(', ')}`)
    for (const e of extra) console.log(`  send  ${e}  (EXTRA — manually added, not a DB registration)`)
  } else {
    recipients = [c.TEST_TO]
    console.log(`TEST — sending only to ${c.TEST_TO}`)
  }

  let ok = 0
  for (const to of recipients) {
    const subject = c.MODE === 'test' ? `[TEST] ${c.SUBJECT}` : c.SUBJECT
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, attachments }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 200) ok++
    console.log(`${res.status === 200 ? 'OK ' : 'ERR'} ${to}  ${json.id || JSON.stringify(json)}`)
  }
  console.log(`\n=== ${ok}/${recipients.length} sent (${c.MODE}) ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
