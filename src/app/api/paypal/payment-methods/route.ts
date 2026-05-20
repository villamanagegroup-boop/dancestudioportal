import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin
    .from('payment_methods')
    .select('id, card_brand, last_four, is_default')
    .eq('guardian_id', user.id)
    .eq('provider', 'paypal')
    .not('paypal_token_id', 'is', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json({ methods: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminClient()
  // Scope delete to the owner's rows only.
  const { error } = await admin
    .from('payment_methods')
    .delete()
    .eq('id', id)
    .eq('guardian_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
