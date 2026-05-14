import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { date_of_birth } = await req.json()
  if (!date_of_birth) return NextResponse.json({ error: 'date_of_birth required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('first_name, last_name, phone').eq('id', id).single()
  if (!profile) return NextResponse.json({ error: 'family not found' }, { status: 404 })

  const { data: existingLink } = await supabase
    .from('guardian_students')
    .select('student_id')
    .eq('guardian_id', id)
    .eq('relationship', 'self')
    .maybeSingle()
  if (existingLink) return NextResponse.json({ error: 'already self-enrolled', student_id: existingLink.student_id }, { status: 409 })

  const { data: student, error: studentErr } = await supabase
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
  if (studentErr || !student) return NextResponse.json({ error: studentErr?.message ?? 'create failed' }, { status: 400 })

  const { error: linkErr } = await supabase.from('guardian_students').insert({
    guardian_id: id,
    student_id: student.id,
    relationship: 'self',
    is_primary: true,
  })
  if (linkErr) {
    await supabase.from('students').delete().eq('id', student.id)
    return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'self_enrolled_as_dancer',
    meta: { student_id: student.id },
  })

  return NextResponse.json({ ok: true, student_id: student.id })
}
