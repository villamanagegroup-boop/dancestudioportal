import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
  typescript: true,
})

export async function createOrGetStripeCustomer(
  email: string,
  name: string,
  guardianId: string
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { guardian_id: guardianId },
  })
  return customer.id
}
