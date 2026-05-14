import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const PROFILE_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'address_street', 'address_city', 'address_state', 'address_zip',
  'secondary_email', 'secondary_phone',
  'sms_opt_in', 'email_opt_in',
  'tags', 'custom_fields',
  'registration_anniversary',
  'active',
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of PROFILE_FIELDS) {
    if (field in body) update[field] = body[field]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { data: before } = await supabase.from('profiles').select(PROFILE_FIELDS.join(',')).eq('id', id).single()
  const { error } = await supabase.from('profiles').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'profile_updated',
    meta: { before, after: update },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error: authErr } = await supabase.auth.admin.deleteUser(id)
  if (authErr && !/not[_ ]?found/i.test(authErr.message)) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
