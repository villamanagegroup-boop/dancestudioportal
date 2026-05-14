import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const PARTY_FIELDS = [
  'contact_name', 'contact_email', 'contact_phone',
  'event_date', 'start_time', 'end_time',
  'guest_count', 'package', 'price', 'deposit_amount', 'amount_paid', 'deposit_paid',
  'status', 'notes', 'room_id', 'guardian_id', 'student_id',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'guest_count', 'deposit_amount', 'room_id', 'guardian_id', 'student_id',
  'contact_email', 'contact_phone', 'package', 'notes',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of PARTY_FIELDS) {
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

  const { error } = await supabase.from('parties').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('parties').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
