import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('account_invites')
    .select('email, first_name, last_name, role, expires_at, used_at')
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
    role: invite.role,
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
    .from('account_invites')
    .select('id, email, first_name, last_name, role, metadata, expires_at, used_at')
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
      role: invite.role,
    },
  })
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 500 })
  }
  const newUserId = created.user.id

  const metadata = (invite.metadata ?? {}) as Record<string, any>

  const profileUpdate: Record<string, unknown> = {
    role: invite.role,
    first_name: invite.first_name,
    last_name: invite.last_name,
  }
  if (typeof metadata.phone === 'string') profileUpdate.phone = metadata.phone
  if (typeof metadata.address_street === 'string') profileUpdate.address_street = metadata.address_street
  if (typeof metadata.address_city === 'string') profileUpdate.address_city = metadata.address_city
  if (typeof metadata.address_state === 'string') profileUpdate.address_state = metadata.address_state
  if (typeof metadata.address_zip === 'string') profileUpdate.address_zip = metadata.address_zip

  await admin.from('profiles').update(profileUpdate).eq('id', newUserId)

  if (invite.role === 'instructor') {
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
  }

  if (invite.role === 'partner') {
    const partnerName = typeof metadata.business_name === 'string' && metadata.business_name.trim()
      ? metadata.business_name.trim()
      : `${invite.first_name} ${invite.last_name}`.trim()
    const { error: partnerErr } = await admin.from('partners').insert({
      name: partnerName,
      contact_name: `${invite.first_name} ${invite.last_name}`.trim(),
      email: invite.email,
      phone: typeof metadata.phone === 'string' ? metadata.phone : null,
      website: typeof metadata.website === 'string' ? metadata.website : null,
      partner_type: typeof metadata.partner_type === 'string' ? metadata.partner_type : 'business',
      profile_id: newUserId,
      active: true,
    })
    if (partnerErr) {
      return NextResponse.json({
        error: `User created but partner record failed: ${partnerErr.message}. An admin can fix from the Partners page.`,
      }, { status: 500 })
    }
  }

  if (invite.role === 'parent' && metadata.dancer && metadata.dancer.first_name && metadata.dancer.date_of_birth) {
    const { data: student } = await admin.from('students').insert({
      first_name: metadata.dancer.first_name,
      last_name: metadata.dancer.last_name || invite.last_name,
      date_of_birth: metadata.dancer.date_of_birth,
    }).select('id').single()

    if (student) {
      await admin.from('guardian_students').insert({
        guardian_id: newUserId,
        student_id: student.id,
        relationship: 'parent',
        is_primary: true,
      })
    }
  }

  await admin.from('account_invites')
    .update({ used_at: new Date().toISOString(), used_by: newUserId })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, role: invite.role })
}
