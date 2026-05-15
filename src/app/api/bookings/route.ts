import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  if (body.room_id && body.booking_date && body.start_time && body.end_time && body.status !== 'cancelled') {
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, title, start_time, end_time')
      .eq('room_id', body.room_id)
      .eq('booking_date', body.booking_date)
      .neq('status', 'cancelled')
      .lt('start_time', body.end_time)
      .gt('end_time', body.start_time)
    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0]
      return NextResponse.json(
        { error: `Room is already booked for "${c.title}" (${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}) on this date.` },
        { status: 409 },
      )
    }
  }

  const { data, error } = await supabase.from('bookings').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
