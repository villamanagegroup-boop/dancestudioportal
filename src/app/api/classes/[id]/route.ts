import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { requireStaff } from '@/lib/require-staff'

const CLASS_FIELDS = [
  'name', 'description', 'class_type_id', 'season_id',
  'instructor_id', 'room_id', 'day_of_week', 'start_time', 'end_time',
  'start_date', 'end_date', 'registration_start', 'registration_end',
  'max_students', 'monthly_tuition', 'registration_fee',
  'billing_type', 'flat_amount', 'allow_discounts',
  'age_min', 'age_max', 'gender',
  'visible', 'active', 'registration_open', 'internal_registration_only',
  'notes',
] as const

// Columns that are uuid/date/numeric and should become null (not '') when blank
const NULLABLE_WHEN_BLANK = new Set([
  'season_id', 'instructor_id', 'room_id',
  'start_date', 'end_date', 'registration_start', 'registration_end',
  'flat_amount', 'age_min', 'age_max',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of CLASS_FIELDS) {
    if (field in body) {
      const value = body[field]
      update[field] = NULLABLE_WHEN_BLANK.has(field) && (value === '' || value === undefined)
        ? null
        : value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('classes').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: cls } = await supabase.from('classes').select('name').eq('id', id).maybeSingle()
  await logActivity({
    action: 'class.updated',
    targetTable: 'classes',
    targetId: id,
    targetLabel: cls?.name ?? null,
    metadata: { fields: Object.keys(update) },
  }, supabase)

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const supabase = createAdminClient()
  const { data: before } = await supabase.from('classes').select('name').eq('id', id).maybeSingle()
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'class.deleted',
    targetTable: 'classes',
    targetId: id,
    targetLabel: before?.name ?? null,
  }, supabase)

  return NextResponse.json({ ok: true })
}
