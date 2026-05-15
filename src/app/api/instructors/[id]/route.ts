import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const INSTRUCTOR_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'bio', 'specialties',
  'pay_rate', 'pay_type', 'background_check_date', 'background_check_expires', 'active',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'phone', 'bio', 'pay_rate', 'background_check_date', 'background_check_expires',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const f of INSTRUCTOR_FIELDS) {
    if (f in body) {
      const value = body[f]
      update[f] = NULLABLE_WHEN_BLANK.has(f) && (value === '' || value === undefined) ? null : value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('instructors').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
