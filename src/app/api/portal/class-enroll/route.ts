import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getParentPortalSettings } from '@/lib/portal-settings'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'
import { checkEligibility } from '@/lib/eligibility'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { class_id, student_id } = await req.json()
  if (!class_id || !student_id) {
    return NextResponse.json({ error: 'class_id and student_id are required' }, { status: 400 })
  }

  // Act as the effective guardian — a real parent (their own id) OR, when the
  // owner/admin is viewing-as a family, that family's guardian id.
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

  const { data: cls } = await admin
    .from('classes')
    .select('id, name, season_id, max_students, active, registration_open, internal_registration_only, age_min, age_max, gender')
    .eq('id', class_id)
    .single()
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }
  if (!cls.active || !cls.registration_open || cls.internal_registration_only) {
    return NextResponse.json({ error: 'This class is not open for registration' }, { status: 400 })
  }

  // Does the dancer fall within the class's age/gender parameters? If not, the
  // registration is forced to a pending "request" for staff to review — even if
  // the studio normally auto-approves portal enrollments.
  const { data: dancer } = await admin
    .from('students').select('date_of_birth, gender').eq('id', student_id).maybeSingle()
  const eligibility = checkEligibility(dancer ?? {}, cls)
  const outOfParams = !eligibility.fits

  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('class_id', class_id)
    .eq('student_id', student_id)
    .not('status', 'in', '(dropped,completed)')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'This student is already enrolled' }, { status: 409 })
  }

  // Parent-portal settings drive enrollment behavior:
  //  - auto_approve OFF  → enrollments are tentative (pending) until staff confirm
  //  - allow_waitlist OFF → a full class is rejected instead of waitlisted
  // The owner/admin adding a student while viewing-as is always tentative.
  const settings = await getParentPortalSettings()
  const tentative = viewer.isPreview

  let status: string
  let waitlistPosition: number | null = null
  let waitlisted = false
  let pending = false

  const { count: activeCount } = await admin
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', class_id)
    .eq('status', 'active')
  const full = (activeCount ?? 0) >= (cls.max_students ?? 0)

  if (tentative || !settings.auto_approve || outOfParams) {
    status = 'pending'
    pending = true
  } else if (full) {
    if (!settings.allow_waitlist) {
      return NextResponse.json({ error: 'This class is full and the waitlist is closed.' }, { status: 409 })
    }
    const { count: wl } = await admin
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', class_id)
      .eq('status', 'waitlisted')
    waitlistPosition = (wl ?? 0) + 1
    waitlisted = true
    status = 'waitlisted'
  } else {
    status = 'active'
  }

  const { data: enrollment, error } = await admin.from('enrollments').insert({
    class_id,
    student_id,
    season_id: cls.season_id,
    status,
    waitlist_position: waitlistPosition,
    notes: pending
      ? outOfParams
        ? `Request — dancer is ${eligibility.reasons.join(' and ')}. Pending studio approval.`
        : (tentative ? 'Tentative — added by studio, pending confirmation' : 'Pending studio approval')
      : null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify staff + log it — a parent-initiated enrollment (skip when the studio
  // is just adding it themselves while viewing-as).
  if (!tentative) {
    const { data: student } = await admin
      .from('students').select('first_name, last_name').eq('id', student_id).maybeSingle()
    const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || null : null
    await logActivity({
      action: pending ? 'enrollment.requested' : 'enrollment.created',
      targetTable: 'enrollments',
      targetId: enrollment.id,
      targetLabel: studentName && cls.name ? `${studentName} → ${cls.name}` : studentName,
      metadata: { class_id, student_id, status, source: 'parent_portal' },
    }, admin)
    await notify({
      type: pending ? 'enrollment.requested' : 'enrollment.created',
      title: pending ? 'New enrollment request' : waitlisted ? 'New waitlist entry' : 'New enrollment',
      body: studentName && cls.name
        ? `${studentName} → ${cls.name}${outOfParams ? ` · ${eligibility.reasons.join(', ')}` : pending ? ' · needs approval' : ''}`
        : 'A parent registered a dancer',
      href: pending ? '/enrollments' : `/classes/${class_id}`,
      metadata: { class_id, student_id, status, outOfParams },
    }, admin)
  }

  return NextResponse.json({ ok: true, pending, waitlisted, outOfParams, reasons: eligibility.reasons }, { status: 201 })
}
