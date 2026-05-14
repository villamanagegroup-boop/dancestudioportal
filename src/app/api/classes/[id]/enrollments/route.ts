import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params
  const { student_id } = await req.json()
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: cls, error: classErr } = await supabase
    .from('classes').select('id, season_id').eq('id', classId).single()
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

  return NextResponse.json(data, { status: 201 })
}
