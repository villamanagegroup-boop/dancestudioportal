import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TYPES = ['event', 'meeting', 'blackout', 'placeholder']

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!body.start_date) {
    return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
  }
  if (body.event_type && !VALID_TYPES.includes(body.event_type)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
  }

  const allDay = !!body.all_day
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: body.title.trim(),
      event_type: body.event_type ?? 'event',
      start_date: body.start_date,
      end_date: body.end_date || null,
      all_day: allDay,
      start_time: allDay ? null : body.start_time || null,
      end_time: allDay ? null : body.end_time || null,
      room_id: body.room_id || null,
      color: body.color || null,
      notes: body.notes || null,
      recurrence: body.recurrence === 'weekly' ? 'weekly' : 'none',
      recurrence_end: body.recurrence === 'weekly' ? body.recurrence_end || null : null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data, { status: 201 })
}
