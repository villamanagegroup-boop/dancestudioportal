import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrder } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { invoiceId, saveCard, savedMethodId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, amount, description, status, guardian_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.guardian_id !== user.id) return NextResponse.json({ error: 'Not your invoice' }, { status: 403 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice is already paid' }, { status: 409 })

  // Resolve an existing PayPal customer id (so all the family's cards group together).
  const { data: anyMethod } = await admin
    .from('payment_methods')
    .select('paypal_customer_id, paypal_token_id')
    .eq('guardian_id', user.id)
    .eq('provider', 'paypal')
    .not('paypal_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()
  const customerId = anyMethod?.paypal_customer_id ?? null

  // If paying with a saved card, resolve its vault token.
  let savedTokenId: string | null = null
  if (savedMethodId) {
    const { data: method } = await admin
      .from('payment_methods')
      .select('paypal_token_id')
      .eq('id', savedMethodId)
      .eq('guardian_id', user.id)
      .maybeSingle()
    if (!method?.paypal_token_id) return NextResponse.json({ error: 'Saved card not found' }, { status: 404 })
    savedTokenId = method.paypal_token_id
  }

  try {
    const orderId = await createOrder({
      amount: Number(invoice.amount),
      description: invoice.description,
      invoiceId: invoice.id,
      saveCard: !!saveCard,
      customerId,
      savedTokenId,
    })
    return NextResponse.json({ orderId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'PayPal error' }, { status: 500 })
  }
}
