import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Resolve which guardian's cards the caller may act on. Admins may pass
// a guardianId; everyone else is scoped to themselves.
async function resolveTarget(userId: string, admin: ReturnType<typeof createAdminClient>, guardianId?: string | null) {
  if (!guardianId || guardianId === userId) return { ok: true as const, target: userId }
  const { data: caller } = await admin.from('profiles').select('role').eq('id', userId).single()
  if (caller?.role !== 'admin') return { ok: false as const }
  return { ok: true as const, target: guardianId }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const guardianId = request.nextUrl.searchParams.get('guardianId')
  const r = await resolveTarget(user.id, admin, guardianId)
  if (!r.ok) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { data } = await admin
    .from('payment_methods')
    .select('id, card_brand, last_four, is_default')
    .eq('guardian_id', r.target)
    .eq('provider', 'paypal')
    .not('paypal_token_id', 'is', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json({ methods: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { id, guardianId, makeDefault } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const r = await resolveTarget(user.id, admin, guardianId)
  if (!r.ok) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  if (makeDefault) {
    await admin.from('payment_methods').update({ is_default: false }).eq('guardian_id', r.target).eq('provider', 'paypal')
    await admin.from('payment_methods').update({ is_default: true }).eq('id', id).eq('guardian_id', r.target)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { id, guardianId } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const r = await resolveTarget(user.id, admin, guardianId)
  if (!r.ok) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { error } = await admin.from('payment_methods').delete().eq('id', id).eq('guardian_id', r.target)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
