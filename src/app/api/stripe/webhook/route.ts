import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentFailedEmail } from '@/lib/resend'

// Use service role for webhook (bypasses RLS — only used server-side in webhook)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as any
      if (pi.metadata?.invoice_id) {
        await supabase.from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', pi.metadata.invoice_id)
        await supabase.from('payments').insert({
          invoice_id: pi.metadata.invoice_id,
          guardian_id: pi.metadata.guardian_id,
          amount: pi.amount / 100,
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: pi.latest_charge,
        })
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as any
      if (pi.metadata?.invoice_id) {
        await supabase.from('invoices')
          .update({ status: 'failed' })
          .eq('id', pi.metadata.invoice_id)

        // Send failure email
        try {
          const { data: guardian } = await supabase
            .from('profiles').select('email, first_name, last_name')
            .eq('id', pi.metadata.guardian_id).single()
          if (guardian) {
            await sendPaymentFailedEmail({
              to: guardian.email,
              guardianName: `${guardian.first_name} ${guardian.last_name}`,
              amount: pi.amount / 100,
            })
          }
        } catch {}
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as any
      const subscriptionId = inv.subscription
      if (subscriptionId) {
        const { data: enrollment } = await supabase
          .from('enrollments').select('id, guardian_students(guardian_id)').eq('stripe_subscription_id', subscriptionId).single()
        if (enrollment) {
          const guardianId = (enrollment as any).guardian_students?.[0]?.guardian_id
          await supabase.from('invoices').insert({
            guardian_id: guardianId,
            enrollment_id: enrollment.id,
            invoice_type: 'tuition',
            description: 'Monthly Tuition',
            amount: inv.amount_paid / 100,
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_invoice_id: inv.id,
          })
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      await supabase.from('enrollments')
        .update({ status: 'dropped', dropped_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
