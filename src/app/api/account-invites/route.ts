import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountInvite } from '@/lib/resend'

const EXPIRY_DAYS = 7
const VALID_ROLES = new Set(['parent', 'instructor'])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: caller } = await admin
    .from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

  const body = await request.json() as {
    email?: string; first_name?: string; last_name?: string
    role?: string; metadata?: Record<string, unknown>
  }
  const email = body.email?.trim().toLowerCase()
  const first_name = body.first_name?.trim()
  const last_name = body.last_name?.trim()
  const role = body.role?.trim()
  if (!email || !first_name || !last_name || !role) {
    return NextResponse.json({ error: 'Email, first name, last name, and role are required' }, { status: 400 })
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${[...VALID_ROLES].join(', ')}` }, { status: 400 })
  }

  const { data: existingUser } = await admin
    .from('profiles').select('id, role').eq('email', email).maybeSingle()
  if (existingUser) {
    return NextResponse.json({
      error: `Account already exists for ${email} (role: ${existingUser.role}).`,
    }, { status: 409 })
  }

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertErr } = await admin.from('account_invites').insert({
    email,
    first_name,
    last_name,
    role,
    metadata: body.metadata ?? {},
    token,
    invited_by: user.id,
    expires_at,
  })
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const acceptUrl = `${appUrl.replace(/\/$/, '')}/accept-invite?token=${token}`

  try {
    await sendAccountInvite({
      to: email,
      firstName: first_name,
      role: role as 'parent' | 'instructor',
      inviterName: `${caller.first_name ?? ''} ${caller.last_name ?? ''}`.trim() || 'The studio',
      acceptUrl,
    })
  } catch (e: unknown) {
    return NextResponse.json({
      ok: true,
      emailed: false,
      acceptUrl,
      warning: `Invite created but email failed: ${(e as Error)?.message ?? 'unknown'}. Share the link manually.`,
    })
  }

  return NextResponse.json({ ok: true, emailed: true, acceptUrl })
}
