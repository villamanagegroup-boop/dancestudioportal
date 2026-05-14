import { NextRequest, NextResponse } from 'next/server'
import { stripe, createOrGetStripeCustomer } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoiceId, amount } = await request.json()

  const { data: profile } = await supabase
    .from('profiles').select('email, first_name, last_name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const customerId = await createOrGetStripeCustomer(
    profile.email,
    `${profile.first_name} ${profile.last_name}`,
    user.id
  )

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    metadata: { invoice_id: invoiceId, guardian_id: user.id },
  })

  // Store payment intent on invoice
  await supabase.from('invoices')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', invoiceId)

  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}
