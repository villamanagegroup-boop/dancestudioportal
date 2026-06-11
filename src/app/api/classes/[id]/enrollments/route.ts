import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params
  const { student_id } = await req.json()
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: cls, error: classErr } = await supabase
    .from('classes').select('id, season_id, name').eq('id', classId).single()
  if (classErr || !cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', student_id)
    .not('status', 'in', '(dropped,completed)')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Student is already enrolled in this class' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      class_id: classId,
      student_id,
      season_id: cls.season_id,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: student } = await supabase
    .from('students').select('first_name, last_name').eq('id', student_id).maybeSingle()
  const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : null
  await logActivity({
    action: 'enrollment.created',
    targetTable: 'enrollments',
    targetId: data.id,
    targetLabel: studentName && cls.name ? `${studentName} → ${cls.name}` : studentName,
    metadata: { class_id: classId, student_id },
  }, supabase)

  await notify({
    type: 'enrollment.created',
    title: 'New enrollment',
    body: studentName && cls.name ? `${studentName} enrolled in ${cls.name}` : 'A student was enrolled',
    href: `/classes/${classId}`,
    metadata: { class_id: classId, student_id },
  }, supabase)

  return NextResponse.json(data, { status: 201 })
}
