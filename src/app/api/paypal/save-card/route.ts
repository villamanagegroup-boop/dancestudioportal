import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymentTokenFromSetup } from '@/lib/paypal'

// Exchanges an approved setup token for a permanent vault token and stores
// it on the guardian's payment_methods. Admins may pass guardianId.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { setupTokenId, guardianId } = await request.json()
  if (!setupTokenId) return NextResponse.json({ error: 'Missing setupTokenId' }, { status: 400 })

  const admin = createAdminClient()
  let targetGuardian = user.id
  if (guardianId && guardianId !== user.id) {
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add cards for other accounts' }, { status: 403 })
    }
    targetGuardian = guardianId
  }

  let vault
  try {
    vault = await createPaymentTokenFromSetup(setupTokenId)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to vault card' }, { status: 500 })
  }

  const card = vault.payment_source?.card
  const customerId = vault.customer?.id ?? null

  const { data: existing } = await admin
    .from('payment_methods').select('id').eq('guardian_id', targetGuardian).eq('paypal_token_id', vault.id).maybeSingle()
  if (!existing) {
    const { count } = await admin
      .from('payment_methods').select('id', { count: 'exact', head: true }).eq('guardian_id', targetGuardian)
    await admin.from('payment_methods').insert({
      guardian_id: targetGuardian,
      provider: 'paypal',
      paypal_customer_id: customerId,
      paypal_token_id: vault.id,
      last_four: card?.last_digits ?? null,
      card_brand: card?.brand ?? null,
      is_default: (count ?? 0) === 0,
    })
  }

  return NextResponse.json({ ok: true })
}
