// Suppression-aware bulk mailer for Node send scripts.
// ------------------------------------------------------------------
// Every studio newsletter / blast should send through here so that:
//   1. Unsubscribed + archived contacts are skipped (checked against the
//      email_subscribers list AND profiles.email_opt_out).
//   2. Each message carries a personal unsubscribe footer + the
//      List-Unsubscribe / List-Unsubscribe-Post headers Gmail now requires
//      from bulk senders (https://support.google.com/mail/answer/81126).
//   3. last_emailed_at is stamped on the subscriber row.
//
// Usage:
//   import { loadEnv, createMailer } from './lib/mailer.mjs'
//   const env = loadEnv()
//   const mailer = createMailer(env)
//   const { suppressed, sendable } = await mailer.filter(recipients) // [{email,name}]
//   await mailer.sendBulk({ subject, html, attachments, recipients: sendable, dryRun })
//
// Run scripts from the repo root so .env.local resolves.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { unsubscribeUrl, normalizeEmail } from './unsub.mjs'

export function loadEnv() {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
  for (const k of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'UNSUBSCRIBE_SECRET']) {
    if (!env[k]) throw new Error(`Missing ${k} in .env.local`)
  }
  env.NEXT_PUBLIC_APP_URL ||= 'https://studio.capitalcoredance.com'
  return env
}

function footerHtml(url) {
  return `
  <div style="margin:28px 0 0;padding-top:14px;border-top:1px solid #eee;font-size:12px;color:#9ca3af;text-align:center;line-height:1.5;">
    <p style="margin:0 0 4px;">Capital Core Dance Studio · 13110 Midlothian Turnpike, Midlothian, VA 23113</p>
    <p style="margin:0;">You're receiving this because you're connected with our studio.
      <a href="${url}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.</p>
  </div>`
}

export function createMailer(env) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const FROM = `Capital Core Dance <${env.RESEND_FROM_EMAIL}>`

  // Split recipients into sendable vs suppressed using the live opt-out state.
  async function filter(recipients) {
    const byEmail = new Map()
    for (const r of recipients) {
      const key = normalizeEmail(r.email)
      if (key && !byEmail.has(key)) byEmail.set(key, { email: r.email.trim(), name: r.name ?? '' })
    }

    const suppressedSet = new Set()
    const { data: subs } = await sb.from('email_subscribers').select('email,status')
    for (const s of subs ?? []) {
      if (s.status !== 'subscribed') suppressedSet.add(normalizeEmail(s.email))
    }
    const { data: optedOut } = await sb.from('profiles').select('email').eq('email_opt_out', true)
    for (const p of optedOut ?? []) if (p.email) suppressedSet.add(normalizeEmail(p.email))

    const sendable = []
    const suppressed = []
    for (const [key, r] of byEmail) (suppressedSet.has(key) ? suppressed : sendable).push(r)
    return { sendable, suppressed }
  }

  async function sendBulk({ subject, html, attachments = [], recipients, dryRun = true }) {
    let ok = 0
    let fail = 0
    for (const r of recipients) {
      const url = unsubscribeUrl(r.email, { appUrl: env.NEXT_PUBLIC_APP_URL, secret: env.UNSUBSCRIBE_SECRET })
      const body = {
        from: FROM,
        to: [r.email],
        subject,
        html: `${html}${footerHtml(url)}`,
        attachments,
        headers: {
          'List-Unsubscribe': `<${url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
      if (dryRun) {
        console.log(`  [dry] would send → ${r.email}`)
        continue
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 200) {
        ok++
        // Best-effort: don't fail a successful send if the list row/table isn't there.
        try {
          await sb.from('email_subscribers').update({ last_emailed_at: new Date().toISOString() }).ilike('email', r.email)
        } catch {
          /* ignore */
        }
        console.log(`  ok   ${r.email}  ${json.id ?? ''}`)
      } else {
        fail++
        console.log(`  FAIL ${r.email}  ${JSON.stringify(json)}`)
      }
    }
    return { ok, fail, total: recipients.length }
  }

  return { sb, filter, sendBulk }
}
