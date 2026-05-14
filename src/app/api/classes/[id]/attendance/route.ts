import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params
  const { session_date, records, notes } = await req.json()

  if (!session_date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'session_date and records are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: session, error: sessionErr } = await supabase
    .from('class_sessions')
    .upsert(
      { class_id: classId, session_date, notes: notes ?? null },
      { onConflict: 'class_id,session_date' },
    )
    .select('id')
    .single()
  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message ?? 'Could not create session' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const rows = records.map((r: { student_id: string; present: boolean }) => ({
    session_id: session.id,
    student_id: r.student_id,
    present: !!r.present,
    checked_in_at: r.present ? now : null,
  }))

  if (rows.length > 0) {
    const { error: attErr } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'session_id,student_id' })
    if (attErr) return NextResponse.json({ error: attErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, session_id: session.id })
}
