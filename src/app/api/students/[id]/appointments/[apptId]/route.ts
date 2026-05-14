import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const { id, apptId } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  for (const k of ['title', 'scheduled_at', 'duration_minutes', 'location', 'instructor_id', 'notes', 'status', 'appointment_type']) {
    if (k in body) update[k] = body[k]
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_appointments')
    .update(update)
    .eq('id', apptId)
    .eq('student_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const { id, apptId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_appointments')
    .delete()
    .eq('id', apptId)
    .eq('student_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: 'appointment_cancelled',
    meta: { appointment_id: apptId },
  })

  return NextResponse.json({ ok: true })
}
