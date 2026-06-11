import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// List the effective family's dancers.
export async function GET() {
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin
    .from('guardian_students')
    .select('relationship, is_primary, student:students(id, first_name, last_name, date_of_birth, active)')
    .eq('guardian_id', effectiveId)
  const dancers = (data ?? [])
    .map((r: any) => ({ ...r.student, relationship: r.relationship }))
    .filter((s: any) => s && s.id)
  return NextResponse.json({ dancers })
}

// Add a dancer to the effective family.
export async function POST(req: NextRequest) {
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { first_name, last_name, date_of_birth, gender, medical_notes } = await req.json()
  if (!first_name?.trim() || !last_name?.trim() || !date_of_birth) {
    return NextResponse.json({ error: 'First name, last name, and date of birth are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: student, error: studentErr } = await admin
    .from('students')
    .insert({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date_of_birth,
      gender: gender || null,
      medical_notes: medical_notes || null,
      active: true,
    })
    .select('id')
    .single()
  if (studentErr || !student) return NextResponse.json({ error: studentErr?.message ?? 'Could not add dancer' }, { status: 400 })

  const { error: linkErr } = await admin.from('guardian_students').insert({
    guardian_id: effectiveId,
    student_id: student.id,
    relationship: 'parent',
    is_primary: true,
  })
  if (linkErr) {
    await admin.from('students').delete().eq('id', student.id)
    return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  await admin.from('family_activity_log').insert({
    guardian_id: effectiveId,
    action: 'dancer_added',
    meta: { student_id: student.id, name: `${first_name} ${last_name}`, source: 'portal' },
  })

  return NextResponse.json({ ok: true, student_id: student.id }, { status: 201 })
}
