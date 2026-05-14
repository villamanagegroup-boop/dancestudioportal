import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

// Accepts { hours: [{ day_of_week, is_open, open_time, close_time }, ...] }
export async function PATCH(req: NextRequest) {
  const { hours } = await req.json()
  if (!Array.isArray(hours)) {
    return NextResponse.json({ error: 'hours array is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  for (const row of hours) {
    if (!DAYS.includes(row.day_of_week)) {
      return NextResponse.json({ error: `Invalid day: ${row.day_of_week}` }, { status: 400 })
    }
    const { error } = await supabase
      .from('studio_hours')
      .update({
        is_open: !!row.is_open,
        open_time: row.open_time,
        close_time: row.close_time,
      })
      .eq('day_of_week', row.day_of_week)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
