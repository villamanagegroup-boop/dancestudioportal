import { NextRequest, NextResponse } from 'next/server'
import { stripe, createOrGetStripeCustomer } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { enrollmentId, paymentMethodId } = await request.json()

  // Get enrollment and class info
  const { data: enrollment } = await supabase
    .from('enrollments').select(`
      *, class:classes(name, monthly_tuition, stripe_price_id)
    `).eq('id', enrollmentId).single()

  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles').select('email, first_name, last_name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const customerId = await createOrGetStripeCustomer(
    profile.email,
    `${profile.first_name} ${profile.last_name}`,
    user.id
  )

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })

  // Get or create Stripe price for this class
  const cls = enrollment.class as any
  let priceId = cls?.stripe_price_id

  if (!priceId && cls) {
    const price = await stripe.prices.create({
      unit_amount: Math.round(cls.monthly_tuition * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: cls.name },
    })
    priceId = price.id
    await supabase.from('classes')
      .update({ stripe_price_id: priceId })
      .eq('id', enrollment.class_id)
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: { enrollment_id: enrollmentId, guardian_id: user.id },
  })

  // Store subscription ID on enrollment
  await supabase.from('enrollments')
    .update({ stripe_subscription_id: subscription.id })
    .eq('id', enrollmentId)

  return NextResponse.json({
    subscriptionId: subscription.id,
    clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
  })
}
