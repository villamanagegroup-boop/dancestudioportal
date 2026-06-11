import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// The guardian registers themselves as an adult dancer (relationship = 'self').
export async function POST(req: NextRequest) {
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { date_of_birth } = await req.json()
  if (!date_of_birth) return NextResponse.json({ error: 'Your date of birth is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('first_name, last_name, phone').eq('id', effectiveId).single()
  if (!profile) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const { data: existing } = await admin
    .from('guardian_students')
    .select('student_id')
    .eq('guardian_id', effectiveId)
    .eq('relationship', 'self')
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "You're already registered as a dancer.", student_id: existing.student_id }, { status: 409 })

  const { data: student, error: studentErr } = await admin
    .from('students')
    .insert({
      first_name: profile.first_name,
      last_name: profile.last_name,
      date_of_birth,
      emergency_contact_phone: profile.phone,
      active: true,
    })
    .select('id')
    .single()
  if (studentErr || !student) return NextResponse.json({ error: studentErr?.message ?? 'Could not register' }, { status: 400 })

  const { error: linkErr } = await admin.from('guardian_students').insert({
    guardian_id: effectiveId,
    student_id: student.id,
    relationship: 'self',
    is_primary: true,
  })
  if (linkErr) {
    await admin.from('students').delete().eq('id', student.id)
    return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  await admin.from('family_activity_log').insert({
    guardian_id: effectiveId,
    action: 'self_enrolled_as_dancer',
    meta: { student_id: student.id, source: 'portal' },
  })

  return NextResponse.json({ ok: true, student_id: student.id }, { status: 201 })
}
