import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const FIELDS = ['day_date', 'start_time', 'end_time', 'title', 'location', 'notes', 'sort_order']
const NULLABLE_WHEN_BLANK = new Set(['start_time', 'end_time', 'location', 'notes'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id: campId, itemId } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of FIELDS) {
    if (field in body) {
      const value = body[field]
      update[field] =
        NULLABLE_WHEN_BLANK.has(field) && (value === '' || value === undefined) ? null : value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('camp_itinerary')
    .update(update)
    .eq('id', itemId)
    .eq('camp_id', campId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id: campId, itemId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('camp_itinerary')
    .delete()
    .eq('id', itemId)
    .eq('camp_id', campId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
