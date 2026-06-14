// ============================================================
// Camp "starts tomorrow" email sender — reusable per camp week.
//
// HOW TO USE (each week):
//   1. Edit the CONFIG block below (theme, dates, highlights, flyer, camp id…).
//   2. Run a TEST first:   node scripts/camp-emails/send-camp-email.mjs
//      (MODE='test' sends ONLY to TEST_TO so you can preview.)
//   3. When it looks right, set MODE='live' and run again. It pulls the camp
//      roster from Supabase, dedupes by household (primary guardian email),
//      and sends one individual email per family.
//
// Run from the repo root (so .env.local resolves). Needs RESEND_API_KEY,
// RESEND_FROM_EMAIL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Known camp ids (tenant Capital Core, 2026 summer):
//   Rainbow Remix       Jun 15–19  9f9eca78-5a34-45cc-8a5f-4eb8d498b01b
//   Glow Dance Party    Jun 22–26  0ed931bb-22b4-44c8-a29a-e9b5556885b8
//   Pop Stars/Performers Jun 29–Jul 3 7c052eed-3000-4afa-8a0c-a041fa6faba2
//   Around The World    Jul 6–10   af335f4f-59af-4fb5-8bda-3f78881461fb
//   Beach Bash Boogie   Jul 13–17  6c6af0d6-ca83-4cf5-af2f-854675f3584f
//   Movie Magic         Jul 20–24  35941e17-e222-410b-b02b-dcf3bb8a031f
//   Dance & Dream Spirit Jul 27–31 3103bb51-9c8a-40f0-a355-1f59b2ab9589
//   Princess and Heroes Aug 3–7    27f15bc9-9c1a-4043-a0d6-008907d410a4
// ============================================================

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------- CONFIG
const CONFIG = {
  MODE: 'test',                       // 'test' = only TEST_TO  |  'live' = whole roster
  TEST_TO: 'villamanagegroup@gmail.com',
  EXCLUDE: [],                        // emails to skip in live mode, e.g. test accounts

  CAMP_ID: '9f9eca78-5a34-45cc-8a5f-4eb8d498b01b',  // roster source (live mode)
  STATUSES: ['registered'],           // which registration statuses to email

  WEEK_LABEL: 'Week 1: Rainbow Remix',
  THEME: 'Rainbow Remix',
  THEME_EMOJI: '🌈',
  DATES: 'June 15–19',
  SUBJECT: '🌈 Rainbow Remix Camp Starts Tomorrow! (Week 1: June 15–19)',

  // Daily highlights (with leading emoji).
  HIGHLIGHTS: [
    '🌈 Rainbow Warm-Up',
    '🤸 Colorful Movement & Acro Adventures',
    '⭐ Rainbow Relay Games',
    '🎨 Rainbow Creation Station Craft',
    '💃 Rainbow Remix Dance Rehearsal',
    '🎉 Plenty of music, movement, and fun throughout the day',
  ],

  // End-of-week showcase line. Set SHOWCASE.enabled=false to omit the section.
  SHOWCASE: { enabled: true, day: 'Friday', time: '3:20 PM' },

  PAYPAL_LINK: 'https://www.paypal.com/ncp/payment/8JPXEP2ENA9XG',

  // Absolute paths to the week's flyer + the studio logo.
  FLYER_PATH: 'C:/Users/hicks/Downloads/ChatGPT Image Jun 14, 2026, 10_50_24 AM.png',
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
  const li = s => `    <li>${s}</li>`
  const showcase = c.SHOWCASE.enabled ? `
  <h2 style="font-size:18px;color:#c026d3;margin:24px 0 8px;">End-of-Week Showcase</h2>
  <p style="margin:0 0 10px;">We will be wrapping up ${c.THEME} Week with a special <strong>Mini Showcase on ${c.SHOWCASE.day} at ${c.SHOWCASE.time}</strong>!</p>
  <p style="margin:0 0 8px;">Families are invited to join us as campers share some of the dances, activities, and skills they have learned throughout the week. This informal performance is a fun opportunity for dancers to celebrate their accomplishments and show off everything they have been working on.</p>` : ''
  return `
<div style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b3a;line-height:1.55;">
  <p style="font-size:17px;margin:0 0 12px;">Hello Camp Families,</p>
  <p style="margin:0 0 16px;">We are so excited to welcome your dancer to <strong>${c.WEEK_LABEL}</strong> tomorrow at Capital Core Dance! ${c.THEME_EMOJI}</p>
  <img src="cid:${flyerCid}" alt="${c.THEME} Week schedule" width="560" style="width:100%;max-width:560px;height:auto;border-radius:14px;margin:8px 0 20px;display:block;border:1px solid #eee;" />
  <p style="margin:0 0 18px;">We have an exciting week planned full of colorful adventures, dancing, games, crafts, creativity, and plenty of fun. Throughout the week, dancers will explore movement, self-expression, teamwork, and imagination.</p>
  <h2 style="font-size:18px;color:#6d28d9;margin:24px 0 8px;">Camp Details</h2>
  <p style="margin:0 0 4px;">📅 <strong>Camp Week:</strong> ${c.DATES}</p>
  <p style="margin:0 0 4px;">☀️ <strong>Full Day Camp:</strong> 9:30 AM – 3:30 PM</p>
  <p style="margin:0 0 4px;">🌤️ <strong>Half Day Camp:</strong> 9:30 AM – 12:30 PM</p>
  <p style="margin:0 0 4px;">🚪 <strong>Drop-Off Begins:</strong> 9:15 AM</p>
  <h2 style="font-size:18px;color:#db2777;margin:24px 0 8px;">What to Bring</h2>
  <ul style="margin:0 0 8px;padding-left:20px;">
    <li>Water bottle (labeled with your child's name)</li>
    <li>Lunch (full-day campers only)</li>
    <li>Two snacks</li>
    <li>Comfortable clothing that is easy to move in</li>
    <li>Dance shoes (if they have them) or clean sneakers</li>
    <li>A positive attitude and lots of colorful energy!</li>
  </ul>
  <h2 style="font-size:18px;color:#ea580c;margin:24px 0 8px;">Tomorrow's Highlights</h2>
  <ul style="margin:0 0 8px;padding-left:20px;list-style:none;">
${c.HIGHLIGHTS.map(li).join('\n')}
  </ul>
  <h2 style="font-size:18px;color:#dc2626;margin:24px 0 8px;">Allergy &amp; Medical Information</h2>
  <p style="margin:0 0 10px;">The safety of our campers is extremely important to us.</p>
  <p style="margin:0 0 10px;">If your child has any food allergies, dietary restrictions, medical concerns, medications, behavioral supports, sensory needs, or any other information that would help our staff best support them during camp, please reply to this email as soon as possible if you have not already provided that information.</p>
  <p style="margin:0 0 8px;">Our goal is to ensure every camper has a safe, successful, and enjoyable week.</p>${showcase}
  <h2 style="font-size:18px;color:#0891b2;margin:24px 0 8px;">Before &amp; After Care</h2>
  <p style="margin:0 0 4px;">If you registered for After Care, please remember:</p>
  <p style="margin:0 0 4px;"><strong>After Care:</strong> 3:30 PM – 4:30 PM</p>
  <h2 style="font-size:18px;color:#16a34a;margin:24px 0 8px;">Camp Tuition Reminder</h2>
  <p style="margin:0 0 12px;">A friendly reminder that all camp balances are due prior to the start of camp tomorrow.</p>
  <p style="margin:0 0 16px;">If you need a reminder of your remaining balance, please reply to this email and we will be happy to provide it. Otherwise, payment may be submitted using the button below:</p>
  <p style="text-align:center;margin:0 0 8px;">
    <a href="${c.PAYPAL_LINK}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 34px;border-radius:999px;">Pay Camp Balance</a>
  </p>
  <p style="text-align:center;font-size:12px;color:#888;margin:0 0 8px;">or copy this link: <a href="${c.PAYPAL_LINK}" style="color:#6d28d9;">${c.PAYPAL_LINK}</a></p>
  <h2 style="font-size:18px;color:#7c3aed;margin:24px 0 8px;">Pick-Up</h2>
  <p style="margin:0 0 6px;">Please plan to pick up your camper promptly at the end of their camp session:</p>
  <ul style="margin:0 0 8px;padding-left:20px;">
    <li><strong>Half-Day Camp:</strong> 12:30 PM</li>
    <li><strong>Full-Day Camp:</strong> 3:30 PM</li>
    <li><strong>After Care Pick-Up:</strong> 4:30 PM</li>
  </ul>
  <p style="margin:18px 0 0;">We will be sharing photos and highlights throughout the week, so be sure to follow along on our social media pages.</p>
  <p style="margin:14px 0 0;">Thank you for choosing Capital Core Dance for your child's summer adventures. We can't wait to kick off an amazing week and make colorful memories together!</p>
  <p style="margin:14px 0 0;">See you tomorrow!</p>
  <div style="margin:24px 0 0;padding-top:16px;border-top:2px solid #eee;font-size:14px;color:#444;">
    <p style="margin:0 0 8px;">Best,</p>
    <p style="margin:0;font-weight:700;color:#1e1b4b;">Chanel W.M. Hicks-Gray</p>
    <p style="margin:1px 0 0;">Studio and Competition Owner</p>
    <p style="margin:1px 0 0;">Capital Core Dance Studio and Challenge</p>
    <p style="margin:1px 0 0;">13110 Midlothian Turnpike,<br/>Midlothian, VA 23113</p>
    <img src="cid:${logoCid}" alt="Capital Core Dance Studio" width="120" style="width:120px;height:auto;display:block;margin:12px 0 0;" />
  </div>
  <p style="margin:18px 0 0;font-size:13px;color:#777;font-style:italic;">P.S. Feel free to have your dancer wear their favorite bright colors tomorrow as we kick off ${c.THEME} Week! ${c.THEME_EMOJI}✨</p>
</div>
</div>`
}

// Pull deduped recipient emails for the camp roster (primary guardian per camper).
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
    { filename: 'Camp-Week-Schedule.png', content: flyerB64, content_id: 'flyer' },
    { filename: 'Camp-Week-Schedule.png', content: flyerB64 },
    { filename: 'capital-core-dance-logo.png', content: logoB64, content_id: 'logo' },
  ]

  let recipients
  if (c.MODE === 'live') {
    const roster = await getRoster(c)
    recipients = [...roster.keys()].filter(e => !c.EXCLUDE.includes(e))
    console.log(`LIVE — ${recipients.length} households for ${c.WEEK_LABEL}:`)
    for (const [email, info] of roster) console.log(`  ${c.EXCLUDE.includes(email) ? 'SKIP' : 'send'}  ${email}  (${info.name}) — ${info.campers.join(', ')}`)
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
