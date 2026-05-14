import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campId } = await params
  const { attend_date, records } = await req.json()

  if (!attend_date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'attend_date and records are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const rows = records.map((r: { student_id: string; present: boolean }) => ({
    camp_id: campId,
    student_id: r.student_id,
    attend_date,
    present: !!r.present,
    checked_in_at: r.present ? now : null,
  }))

  if (rows.length > 0) {
    const { error } = await supabase
      .from('camp_attendance')
      .upsert(rows, { onConflict: 'camp_id,student_id,attend_date' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
