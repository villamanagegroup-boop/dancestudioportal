import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  _stripe = new Stripe(key, {
    apiVersion: '2024-06-20' as any,
    typescript: true,
  })
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop]
  },
})

export async function createOrGetStripeCustomer(
  email: string,
  name: string,
  guardianId: string
): Promise<string> {
  const s = getStripe()
  const existing = await s.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id
  const customer = await s.customers.create({
    email,
    name,
    metadata: { guardian_id: guardianId },
  })
  return customer.id
}
