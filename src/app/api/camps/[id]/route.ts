import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const CAMP_FIELDS = [
  'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time',
  'max_capacity', 'price', 'deposit_amount', 'age_min', 'age_max',
  'instructor_id', 'room_id', 'registration_open', 'what_to_bring', 'parent_notes',
  'active',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'start_time', 'end_time', 'deposit_amount', 'age_min', 'age_max',
  'instructor_id', 'room_id',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of CAMP_FIELDS) {
    if (field in body) {
      const value = body[field]
      update[field] =
        NULLABLE_WHEN_BLANK.has(field) && (value === '' || value === undefined)
          ? null
          : value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('camps').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('camps').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
