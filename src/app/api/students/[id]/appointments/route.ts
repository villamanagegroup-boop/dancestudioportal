import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const TYPES = new Set(['private_lesson', 'fitting', 'evaluation', 'meeting', 'photo', 'other'])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { appointment_type, title, scheduled_at, duration_minutes, location, instructor_id, notes, guardian_id } = await req.json()

  if (!scheduled_at) return NextResponse.json({ error: 'scheduled_at required' }, { status: 400 })
  const type = TYPES.has(appointment_type) ? appointment_type : 'other'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_appointments')
    .insert({
      student_id: id,
      guardian_id: guardian_id || null,
      appointment_type: type,
      title: title?.trim() || null,
      scheduled_at,
      duration_minutes: duration_minutes ? Number(duration_minutes) : null,
      location: location?.trim() || null,
      instructor_id: instructor_id || null,
      notes: notes?.trim() || null,
      status: 'scheduled',
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: 'appointment_scheduled',
    meta: { appointment_id: data.id, type, scheduled_at },
  })

  return NextResponse.json({ ok: true, appointment_id: data.id })
}
