import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getParentPortalSettings } from '@/lib/portal-settings'
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
    .select('id, season_id, max_students, active, registration_open, internal_registration_only')
    .eq('id', class_id)
    .single()
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }
  if (!cls.active || !cls.registration_open || cls.internal_registration_only) {
    return NextResponse.json({ error: 'This class is not open for registration' }, { status: 400 })
  }

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

  if (tentative || !settings.auto_approve) {
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

  const { error } = await admin.from('enrollments').insert({
    class_id,
    student_id,
    season_id: cls.season_id,
    status,
    waitlist_position: waitlistPosition,
    notes: pending ? (tentative ? 'Tentative — added by studio, pending confirmation' : 'Pending studio approval') : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, pending, waitlisted }, { status: 201 })
}
