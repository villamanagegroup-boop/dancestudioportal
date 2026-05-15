import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BOOKING_FIELDS = [
  'title', 'contact_name', 'contact_email', 'contact_phone',
  'booking_date', 'start_time', 'end_time', 'booking_type',
  'price', 'status', 'notes', 'room_id', 'partner_id',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'room_id', 'partner_id', 'contact_name', 'contact_email', 'contact_phone', 'notes',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const f of BOOKING_FIELDS) {
    if (f in body) {
      const value = body[f]
      update[f] = NULLABLE_WHEN_BLANK.has(f) && (value === '' || value === undefined) ? null : value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { data: current } = await supabase.from('bookings').select('*').eq('id', id).single()
  if (current) {
    const merged = { ...current, ...update } as Record<string, any>
    if (merged.room_id && merged.status !== 'cancelled') {
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, title, start_time, end_time')
        .eq('room_id', merged.room_id)
        .eq('booking_date', merged.booking_date)
        .neq('status', 'cancelled')
        .neq('id', id)
        .lt('start_time', merged.end_time)
        .gt('end_time', merged.start_time)
      if (conflicts && conflicts.length > 0) {
        const c = conflicts[0]
        return NextResponse.json(
          { error: `Room conflict with "${c.title}" (${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}) on this date.` },
          { status: 409 },
        )
      }
    }
  }

  const { error } = await supabase.from('bookings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
