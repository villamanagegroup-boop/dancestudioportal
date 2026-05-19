import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('instructor_invites')
    .select('email, first_name, last_name, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.used_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  return NextResponse.json({
    email: invite.email,
    first_name: invite.first_name,
    last_name: invite.last_name,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { token?: string; password?: string }
  const token = body.token
  const password = body.password
  if (!token || !password) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('instructor_invites')
    .select('id, email, first_name, last_name, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.used_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: invite.first_name,
      last_name: invite.last_name,
      role: 'instructor',
    },
  })
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 500 })
  }
  const newUserId = created.user.id

  await admin.from('profiles')
    .update({ role: 'instructor', first_name: invite.first_name, last_name: invite.last_name })
    .eq('id', newUserId)

  const { error: instrErr } = await admin.from('instructors').insert({
    profile_id: newUserId,
    first_name: invite.first_name,
    last_name: invite.last_name,
    email: invite.email,
    active: true,
  })
  if (instrErr) {
    return NextResponse.json({
      error: `User created but instructor record failed: ${instrErr.message}. An admin can fix from the Staff page.`,
    }, { status: 500 })
  }

  await admin.from('instructor_invites')
    .update({ used_at: new Date().toISOString(), used_by: newUserId })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true })
}
