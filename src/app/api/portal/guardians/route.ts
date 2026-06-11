import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountInvite } from '@/lib/resend'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const EXPIRY_DAYS = 14

// List the other guardians who share this family's dancers.
export async function GET() {
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()

  const { data: myLinks } = await admin.from('guardian_students').select('student_id').eq('guardian_id', effectiveId)
  const studentIds = (myLinks ?? []).map(l => l.student_id)
  if (studentIds.length === 0) return NextResponse.json({ guardians: [] })

  const { data: links } = await admin.from('guardian_students').select('guardian_id').in('student_id', studentIds)
  const otherIds = [...new Set((links ?? []).map(l => l.guardian_id))].filter(id => id && id !== effectiveId)
  if (otherIds.length === 0) return NextResponse.json({ guardians: [] })

  const { data: profs } = await admin.from('profiles').select('id, first_name, last_name, email, phone').in('id', otherIds)
  return NextResponse.json({ guardians: profs ?? [] })
}

// Invite another guardian to join this family.
export async function POST(req: NextRequest) {
  const { effectiveId, realUserId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { first_name, last_name, email } = await req.json()
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  if (!first_name?.trim() || !last_name?.trim() || !cleanEmail) {
    return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin.from('profiles').select('id, email').eq('email', cleanEmail).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists. Ask the studio to link them to your family.' }, { status: 409 })
  }

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('account_invites').insert({
    email: cleanEmail,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    role: 'parent',
    metadata: { link_guardian_id: effectiveId, relationship: 'guardian' },
    token,
    invited_by: realUserId ?? effectiveId,
    expires_at,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  try {
    await sendAccountInvite({
      to: cleanEmail,
      firstName: first_name.trim(),
      role: 'parent',
      inviterName: 'Your family',
      acceptUrl: `${appUrl.replace(/\/$/, '')}/accept-invite?token=${token}`,
    } as any)
  } catch {
    // Invite row is created; email delivery is best-effort.
  }

  await admin.from('family_activity_log').insert({
    guardian_id: effectiveId,
    action: 'guardian_invited',
    meta: { email: cleanEmail, source: 'portal' },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
