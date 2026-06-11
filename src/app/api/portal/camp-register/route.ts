import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getParentPortalSettings } from '@/lib/portal-settings'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'
import { checkEligibility } from '@/lib/eligibility'
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
    .select('id, name, max_capacity, active, registration_open, age_min, age_max')
    .eq('id', camp_id)
    .single()
  if (!camp) {
    return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
  }
  if (!camp.active || !camp.registration_open) {
    return NextResponse.json({ error: 'Registration is closed for this camp' }, { status: 400 })
  }

  // Outside the camp's age range → forced to a pending request for staff review.
  const { data: dancer } = await admin
    .from('students').select('date_of_birth, gender').eq('id', student_id).maybeSingle()
  const eligibility = checkEligibility(dancer ?? {}, camp)
  const outOfParams = !eligibility.fits

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

  if (tentative || !settings.auto_approve || outOfParams) {
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

  const { data: registration, error } = await admin.from('camp_registrations').insert({
    camp_id,
    student_id,
    status,
    waitlist_position: waitlistPosition,
    notes: pending
      ? outOfParams
        ? `Request — dancer is ${eligibility.reasons.join(' and ')}. Pending studio approval.`
        : (tentative ? 'Tentative — added by studio, pending confirmation' : 'Pending studio approval')
      : null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (!tentative) {
    const { data: student } = await admin
      .from('students').select('first_name, last_name').eq('id', student_id).maybeSingle()
    const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || null : null
    await logActivity({
      action: pending ? 'camp_registration.requested' : 'camp_registration.created',
      targetTable: 'camp_registrations',
      targetId: registration.id,
      targetLabel: studentName && camp.name ? `${studentName} → ${camp.name}` : studentName,
      metadata: { camp_id, student_id, status, source: 'parent_portal' },
    }, admin)
    await notify({
      type: pending ? 'camp_registration.requested' : 'camp_registration.created',
      title: pending ? 'New camp request' : waitlisted ? 'New camp waitlist' : 'New camp registration',
      body: studentName && camp.name
        ? `${studentName} → ${camp.name}${outOfParams ? ` · ${eligibility.reasons.join(', ')}` : pending ? ' · needs approval' : ''}`
        : 'A parent registered a dancer for a camp',
      href: `/camps/${camp_id}`,
      metadata: { camp_id, student_id, status, outOfParams },
    }, admin)
  }

  return NextResponse.json({ ok: true, pending, waitlisted, outOfParams, reasons: eligibility.reasons }, { status: 201 })
}
