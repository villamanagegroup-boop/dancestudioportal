import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const PARTNER_FIELDS = [
  'name', 'partner_type', 'contact_name', 'email', 'phone',
  'website', 'rate_amount', 'rate_unit', 'notes', 'active',
] as const

const NULLABLE_WHEN_BLANK = new Set([
  'contact_name', 'email', 'phone', 'website', 'rate_amount', 'notes',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const f of PARTNER_FIELDS) {
    if (f in body) {
      let value = body[f]
      if (f === 'rate_amount') value = value === '' || value == null ? null : Number(value)
      else if (NULLABLE_WHEN_BLANK.has(f) && (value === '' || value === undefined)) value = null
      update[f] = value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('partners').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
