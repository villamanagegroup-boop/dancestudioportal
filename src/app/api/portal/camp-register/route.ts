import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getParentPortalSettings } from '@/lib/portal-settings'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { camp_id, student_id } = await req.json()
  if (!camp_id || !student_id) {
    return NextResponse.json({ error: 'camp_id and student_id are required' }, { status: 400 })
  }

  // Act as the effective guardian — a real parent, or the family the owner/admin
  // is currently viewing-as.
  const viewer = await getPortalViewer('g')
  const guardianId = viewer.effectiveId
  if (!guardianId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: link } = await admin
    .from('guardian_students')
    .select('id')
    .eq('guardian_id', guardianId)
    .eq('student_id', student_id)
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'That student is not on this account' }, { status: 403 })
  }

  const { data: camp } = await admin
    .from('camps')
    .select('id, max_capacity, active, registration_open')
    .eq('id', camp_id)
    .single()
  if (!camp) {
    return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
  }
  if (!camp.active || !camp.registration_open) {
    return NextResponse.json({ error: 'Registration is closed for this camp' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('camp_registrations')
    .select('id')
    .eq('camp_id', camp_id)
    .eq('student_id', student_id)
    .not('status', 'eq', 'cancelled')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'This student is already registered' }, { status: 409 })
  }

  // Settings-driven: auto_approve OFF → pending until staff confirm; camp_allow_full
  // OFF → a full camp is rejected. Owner viewing-as is always tentative (pending).
  const settings = await getParentPortalSettings()
  const tentative = viewer.isPreview

  let status: string
  let waitlistPosition: number | null = null
  let waitlisted = false
  let pending = false

  const { count: registeredCount } = await admin
    .from('camp_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('camp_id', camp_id)
    .eq('status', 'registered')
  const full = (registeredCount ?? 0) >= (camp.max_capacity ?? 0)

  if (tentative || !settings.auto_approve) {
    status = 'pending'
    pending = true
  } else if (full) {
    if (!settings.camp_allow_full) {
      return NextResponse.json({ error: 'This camp is full.' }, { status: 409 })
    }
    const { count: wl } = await admin
      .from('camp_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('camp_id', camp_id)
      .eq('status', 'waitlisted')
    waitlistPosition = (wl ?? 0) + 1
    waitlisted = true
    status = 'waitlisted'
  } else {
    status = 'registered'
  }

  const { error } = await admin.from('camp_registrations').insert({
    camp_id,
    student_id,
    status,
    waitlist_position: waitlistPosition,
    notes: pending ? (tentative ? 'Tentative — added by studio, pending confirmation' : 'Pending studio approval') : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, pending, waitlisted }, { status: 201 })
}
