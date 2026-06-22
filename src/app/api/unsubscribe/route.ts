import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { normalizeEmail, verifyUnsubscribeToken } from '@/lib/unsubscribe'
import type { SupabaseClient } from '@supabase/supabase-js'

// Public, no-login endpoint. Authenticity comes from the HMAC token in the
// link, not a session.
//
//   GET  /api/unsubscribe?e=<email>&t=<token>   ← visible footer link click
//        → unsubscribes, then redirects to the friendly /unsubscribe page.
//   POST /api/unsubscribe?e=<email>&t=<token>   ← Gmail/Apple one-click
//        (List-Unsubscribe-Post). Returns 200 JSON, no redirect.
//   POST .../unsubscribe?...&action=resubscribe ← undo, from the page button.

type Action = 'unsubscribe' | 'resubscribe'

async function applyOptOut(
  admin: SupabaseClient,
  email: string,
  action: Action,
  reason: string | null,
) {
  const now = new Date().toISOString()
  const status = action === 'resubscribe' ? 'subscribed' : 'unsubscribed'

  // Link to a portal profile by email, if one exists, and mirror the flag.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (profile) {
    await admin
      .from('profiles')
      .update({
        email_opt_out: action !== 'resubscribe',
        email_opt_out_at: action === 'resubscribe' ? null : now,
      })
      .eq('id', profile.id)
  }

  // Upsert the list row (the email may not be on the list yet — a one-click
  // unsubscribe should still create a suppression record).
  const { data: existing } = await admin
    .from('email_subscribers')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    await admin
      .from('email_subscribers')
      .update({
        status,
        unsubscribed_at: action === 'resubscribe' ? null : now,
        unsubscribe_reason: action === 'resubscribe' ? null : reason,
        profile_id: profile?.id ?? null,
      })
      .eq('id', existing.id)
  } else {
    await admin.from('email_subscribers').insert({
      email,
      status,
      source: 'unsubscribe',
      profile_id: profile?.id ?? null,
      unsubscribed_at: action === 'resubscribe' ? null : now,
      unsubscribe_reason: action === 'resubscribe' ? null : reason,
    })
  }

  await logActivity(
    {
      action: action === 'resubscribe' ? 'email.resubscribed' : 'email.unsubscribed',
      targetTable: 'email_subscribers',
      targetLabel: email,
      metadata: { email, profile_linked: !!profile, reason },
      system: true,
    },
    admin,
  )
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const email = normalizeEmail(sp.get('e') ?? '')
  const token = sp.get('t') ?? ''
  const ok = verifyUnsubscribeToken(email, token)

  // Always land on the friendly page; pass through the (verified) email + token
  // so the page can offer a re-subscribe button.
  const dest = new URL('/unsubscribe', req.url)
  if (!ok) {
    dest.searchParams.set('status', 'invalid')
    return NextResponse.redirect(dest)
  }

  await applyOptOut(createAdminClient(), email, 'unsubscribe', 'link')
  dest.searchParams.set('status', 'done')
  dest.searchParams.set('e', email)
  dest.searchParams.set('t', token)
  return NextResponse.redirect(dest)
}

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const email = normalizeEmail(sp.get('e') ?? '')
  const token = sp.get('t') ?? ''
  const action: Action = sp.get('action') === 'resubscribe' ? 'resubscribe' : 'unsubscribe'

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }

  await applyOptOut(createAdminClient(), email, action, action === 'unsubscribe' ? 'one-click' : null)
  return NextResponse.json({ ok: true, email, status: action === 'resubscribe' ? 'subscribed' : 'unsubscribed' })
}
