import { NextRequest, NextResponse } from 'next/server'
import { stripe, createOrGetStripeCustomer } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoiceId, amount, promoCode } = await request.json()

  const { data: profile } = await supabase
    .from('profiles').select('email, first_name, last_name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let chargeAmount = Number(amount)
  let appliedPromo: { code: string; percent: number | null; amountOff: number | null } | null = null

  if (promoCode) {
    const promos = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 })
    const promo = promos.data[0]
    if (!promo) {
      return NextResponse.json({ error: 'Invalid or inactive promo code' }, { status: 400 })
    }
    const coupon = (promo as any).coupon
    if (coupon.percent_off) {
      chargeAmount = chargeAmount * (1 - coupon.percent_off / 100)
      appliedPromo = { code: promoCode, percent: coupon.percent_off, amountOff: null }
    } else if (coupon.amount_off) {
      chargeAmount = Math.max(0, chargeAmount - coupon.amount_off / 100)
      appliedPromo = { code: promoCode, percent: null, amountOff: coupon.amount_off / 100 }
    }
  }

  if (chargeAmount <= 0) {
    const nowIso = new Date().toISOString()
    await supabase.from('invoices')
      .update({ status: 'paid', paid_at: nowIso, notes: `Comped via ${promoCode}` })
      .eq('id', invoiceId)
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      guardian_id: user.id,
      amount: 0,
      paid_at: nowIso,
    })
    return NextResponse.json({ comped: true, promo: appliedPromo })
  }

  const customerId = await createOrGetStripeCustomer(
    profile.email,
    `${profile.first_name} ${profile.last_name}`,
    user.id
  )

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(chargeAmount * 100),
    currency: 'usd',
    customer: customerId,
    metadata: {
      invoice_id: invoiceId,
      guardian_id: user.id,
      ...(appliedPromo ? { promo_code: appliedPromo.code } : {}),
    },
  })

  await supabase.from('invoices')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', invoiceId)

  return NextResponse.json({
    client_secret: paymentIntent.client_secret,
    amount: chargeAmount,
    promo: appliedPromo,
  })
}
