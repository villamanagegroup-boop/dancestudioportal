import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const FIELDS = [
  'title', 'event_type', 'start_date', 'end_date',
  'all_day', 'start_time', 'end_time', 'room_id', 'color', 'notes',
  'recurrence', 'recurrence_end',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'end_date', 'start_time', 'end_time', 'room_id', 'color', 'notes', 'recurrence_end',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of FIELDS) {
    if (field in body) {
      const value = body[field]
      update[field] = NULLABLE_WHEN_BLANK.has(field) && (value === '' || value === undefined)
        ? null
        : value
    }
  }
  if (update.all_day === true) {
    update.start_time = null
    update.end_time = null
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('calendar_events').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
