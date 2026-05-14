import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { first_name, last_name, date_of_birth, gender, medical_notes, emergency_contact_name, emergency_contact_phone, relationship, is_primary } = await req.json()

  if (!first_name?.trim() || !last_name?.trim() || !date_of_birth) {
    return NextResponse.json({ error: 'first_name, last_name, date_of_birth required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: student, error: studentErr } = await supabase
    .from('students')
    .insert({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date_of_birth,
      gender: gender || null,
      medical_notes: medical_notes || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      active: true,
    })
    .select('id')
    .single()
  if (studentErr || !student) return NextResponse.json({ error: studentErr?.message ?? 'create failed' }, { status: 400 })

  const { error: linkErr } = await supabase.from('guardian_students').insert({
    guardian_id: id,
    student_id: student.id,
    relationship: relationship || 'parent',
    is_primary: is_primary !== false,
  })
  if (linkErr) {
    await supabase.from('students').delete().eq('id', student.id)
    return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'dancer_added',
    meta: { student_id: student.id, name: `${first_name} ${last_name}` },
  })

  return NextResponse.json({ ok: true, student_id: student.id })
}
