import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { captureOrder } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { orderId, invoiceId } = await request.json()
  if (!orderId || !invoiceId) {
    return NextResponse.json({ error: 'Missing orderId or invoiceId' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, amount, status, guardian_id')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.guardian_id !== user.id) return NextResponse.json({ error: 'Not your invoice' }, { status: 403 })

  let capture: any
  try {
    capture = await captureOrder(orderId)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Capture failed' }, { status: 500 })
  }

  if (capture.status !== 'COMPLETED') {
    return NextResponse.json({ error: `Payment not completed (status: ${capture.status})` }, { status: 402 })
  }

  const captured = capture.purchase_units?.[0]?.payments?.captures?.[0]
  const capturedAmount = Number(captured?.amount?.value ?? 0)
  const captureId = captured?.id ?? null

  const nowIso = new Date().toISOString()
  await admin.from('invoices').update({ status: 'paid', paid_at: nowIso }).eq('id', invoiceId)
  await admin.from('payments').insert({
    invoice_id: invoiceId,
    guardian_id: user.id,
    amount: capturedAmount || Number(invoice.amount),
    paid_at: nowIso,
    stripe_charge_id: captureId ? `paypal:${captureId}` : null,
  })

  // If the card was vaulted, persist the token so it can be reused.
  const vault = capture.payment_source?.card?.attributes?.vault
    ?? capture.payment_source?.card?.vault
  const card = capture.payment_source?.card
  if (vault?.id) {
    const customerId = vault.customer?.id ?? null
    // Avoid duplicate rows if the same token comes back.
    const { data: existing } = await admin
      .from('payment_methods')
      .select('id')
      .eq('guardian_id', user.id)
      .eq('paypal_token_id', vault.id)
      .maybeSingle()
    if (!existing) {
      const { count } = await admin
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('guardian_id', user.id)
      await admin.from('payment_methods').insert({
        guardian_id: user.id,
        provider: 'paypal',
        paypal_customer_id: customerId,
        paypal_token_id: vault.id,
        last_four: card?.last_digits ?? null,
        card_brand: card?.brand ?? null,
        is_default: (count ?? 0) === 0,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
