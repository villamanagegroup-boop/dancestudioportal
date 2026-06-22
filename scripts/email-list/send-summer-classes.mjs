// 2026 Summer Classes "starting this week" blast.
// ------------------------------------------------------------------
// Sends through the suppression-aware mailer (scripts/lib/mailer.mjs), so every
// message automatically gets the unsubscribe footer + List-Unsubscribe headers,
// and opted-out / archived contacts are skipped.
//
//   MODE='test'  -> sends ONE copy to TEST_TO (preview). No list needed.
//   MODE='live'  -> recipients = email_subscribers where status='subscribed'
//                   (i.e. "everyone currently loaded", minus opt-outs).
//
// Run from the repo root so .env.local resolves. Requires the email_subscribers
// migration to be applied for live mode.
import { readFileSync } from 'node:fs'
import { loadEnv, createMailer } from '../lib/mailer.mjs'

// ---------------------------------------------------------------- CONFIG
const CONFIG = {
  MODE: 'test', // 'test' | 'live'
  TEST_TO: 'capitalcoredance@gmail.com',

  SUBJECT: 'Summer Classes Start This Week! ☀️',
  BUTTON_URL: 'https://www.capitalcoredance.com/summer-classes',
  BUTTON_LABEL: 'Register for Summer Classes',

  FLYER_PATH: 'C:/Users/hicks/Downloads/ChatGPT Image Jun 22, 2026, 02_43_18 PM.png',
  LOGO_PATH: 'C:/Users/hicks/Downloads/Images/capital core dance challenge (21).png',
}
// --------------------------------------------------------------------------

const env = loadEnv()
const mailer = createMailer(env)

const day = (name, items) => `
  <h3 style="margin:14px 0 4px;color:#6d28d9;font-size:16px;">${name}</h3>
  <ul style="margin:0 0 4px;padding-left:20px;line-height:1.6;">
    ${items.map((i) => `<li>${i}</li>`).join('')}
  </ul>`

function buildHtml(c, flyerCid, logoCid) {
  return `
<div style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b3a;line-height:1.55;">
  <p style="font-size:17px;margin:0 0 12px;">Hello Dance Families,</p>
  <img src="cid:${flyerCid}" alt="Summer Classes — Starting This Week" width="560" style="width:100%;max-width:560px;height:auto;border-radius:14px;margin:8px 0 20px;display:block;border:1px solid #eee;" />
  <p style="margin:0 0 16px;">Summer is in full swing, and while our camps have been keeping us busy, we wanted to remind everyone that our <strong>6-Week Summer Class Session begins this week!</strong></p>
  <p style="margin:0 0 16px;">If your dancer isn't enrolled in a summer class yet, there's still time to join us.</p>
  <p style="margin:0 0 16px;">Summer classes are a great way to stay active, continue building skills, try something new, and stay connected to dance between seasons. Whether your dancer is brand new or has been dancing with us for years, we have classes designed to keep them learning and growing all summer long.</p>

  <h2 style="font-size:18px;color:#db2777;margin:24px 0 4px;">Summer Class Offerings</h2>
  ${day('Tuesdays', ['Tiny Ballet &amp; Tumble (Ages 2–3)', 'Beginner Ballet &amp; Hip Hop (Ages 5–7)', 'Tumble Techniques (Ages 6+)'])}
  ${day('Wednesdays', ['Beginner Ballet &amp; Tap (Ages 5–7)', 'Hip Hop (Ages 5+)', 'Ballet &amp; Contemporary Technique (Ages 7+)'])}
  ${day('Thursdays', ['Tiny Ballet &amp; Tumble (Ages 3–4)', 'Beginner Jazz &amp; Tumble (Ages 5–9)', 'TikTok Hip Hop Dance Workshop (Ages 6+)'])}
  <p style="margin:14px 0 16px;">Our summer instructors are excited and ready to welcome dancers into the studio for six weeks of fun, movement, and skill-building.</p>

  <h2 style="font-size:18px;color:#0891b2;margin:24px 0 8px;">Registration Information</h2>
  <p style="margin:0 0 10px;">If you would like to register, simply reply to this email or contact us and we will help find the best class for your dancer.</p>
  <p style="margin:0 0 8px;">Summer classes run for six weeks and spots remain available in several classes.</p>

  <h2 style="font-size:18px;color:#16a34a;margin:24px 0 8px;">Ready to Register?</h2>
  <p style="margin:0 0 16px;">Use the button below or contact us for assistance:</p>
  <p style="text-align:center;margin:0 0 8px;">
    <a href="${c.BUTTON_URL}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 34px;border-radius:999px;">${c.BUTTON_LABEL}</a>
  </p>
  <p style="text-align:center;font-size:12px;color:#888;margin:0 0 8px;">or copy this link: <a href="${c.BUTTON_URL}" style="color:#6d28d9;">${c.BUTTON_URL}</a></p>

  <p style="margin:18px 0 0;">We would love to see your dancer in the studio this summer. Whether they're looking to improve technique, try a new style, or just have fun dancing with friends, our summer session is a great opportunity to stay moving and make memories.</p>
  <p style="margin:14px 0 0;">We hope to see you this week!</p>

  <div style="margin:24px 0 0;padding-top:16px;border-top:2px solid #eee;font-size:14px;color:#444;">
    <p style="margin:0 0 8px;">Warmly,</p>
    <p style="margin:0;font-weight:700;color:#1e1b4b;">Chanel Hicks-Gray</p>
    <p style="margin:1px 0 0;">Owner &amp; Director</p>
    <p style="margin:1px 0 0;">Capital Core Dance Studio</p>
    <p style="margin:1px 0 0;">13110 Midlothian Turnpike</p>
    <p style="margin:1px 0 0;">Midlothian, VA 23113</p>
    <p style="margin:1px 0 0;">804-234-4014</p>
    <p style="margin:1px 0 0;"><a href="mailto:info@capitalcoredancestudio.com" style="color:#6d28d9;">info@capitalcoredancestudio.com</a></p>
    <img src="cid:${logoCid}" alt="Capital Core Dance Studio" width="120" style="width:120px;height:auto;display:block;margin:12px 0 0;" />
  </div>
</div>
</div>`
}

async function main() {
  const c = CONFIG
  const flyerB64 = readFileSync(c.FLYER_PATH).toString('base64')
  const logoB64 = readFileSync(c.LOGO_PATH).toString('base64')
  const html = buildHtml(c, 'flyer', 'logo')
  const attachments = [
    { filename: 'Summer-Classes.png', content: flyerB64, content_id: 'flyer' },
    { filename: 'Summer-Classes.png', content: flyerB64 },
    { filename: 'capital-core-dance-logo.png', content: logoB64, content_id: 'logo' },
  ]

  const subject = c.MODE === 'test' ? `[TEST] ${c.SUBJECT}` : c.SUBJECT

  if (c.MODE !== 'live') {
    console.log(`TEST — sending one copy to ${c.TEST_TO}`)
    const r = await mailer.sendBulk({ subject, html, attachments, recipients: [{ email: c.TEST_TO, name: 'Test' }], dryRun: false })
    console.log(`\n=== test ${r.ok}/${r.total} sent ===`)
    return
  }

  // LIVE: pull the subscribed list, then defensively re-filter for opt-outs.
  const { data: subs, error } = await mailer.sb
    .from('email_subscribers')
    .select('email, name, status')
    .eq('status', 'subscribed')
  if (error) { console.error('Could not read email_subscribers:', error.message); process.exit(1) }

  const { sendable, suppressed } = await mailer.filter((subs ?? []).map((s) => ({ email: s.email, name: s.name })))
  console.log(`LIVE — ${sendable.length} subscribed recipients (${suppressed.length} suppressed/opted-out skipped):`)
  for (const r of sendable) console.log(`  send  ${r.email}  ${r.name ? `(${r.name})` : ''}`)

  const r = await mailer.sendBulk({ subject, html, attachments, recipients: sendable, dryRun: false })
  console.log(`\n=== live ${r.ok}/${r.total} sent, ${r.fail} failed ===`)
}

main().catch((e) => { console.error(e); process.exit(1) })
