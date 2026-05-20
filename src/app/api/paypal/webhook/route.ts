import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/paypal'

// PayPal posts events here. We verify the signature, then reconcile the
// invoice. The synchronous capture flow usually wins the race, so the
// handlers are idempotent — they no-op if the state already matches.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const verified = await verifyWebhookSignature(request.headers, rawBody)
  if (!verified) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const admin = createAdminClient()

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const capture = event.resource
      const invoiceId = capture?.custom_id
      const captureId = capture?.id
      const amount = Number(capture?.amount?.value ?? 0)
      if (!invoiceId) break

      const { data: invoice } = await admin
        .from('invoices').select('id, guardian_id, status').eq('id', invoiceId).maybeSingle()
      if (!invoice) break

      // Idempotency: skip if we already recorded this capture.
      const tag = captureId ? `paypal:${captureId}` : null
      if (tag) {
        const { data: existing } = await admin
          .from('payments').select('id').eq('stripe_charge_id', tag).maybeSingle()
        if (existing) break
      }

      const nowIso = new Date().toISOString()
      if (invoice.status !== 'paid') {
        await admin.from('invoices').update({ status: 'paid', paid_at: nowIso }).eq('id', invoiceId)
      }
      await admin.from('payments').insert({
        invoice_id: invoiceId,
        guardian_id: invoice.guardian_id,
        amount,
        paid_at: nowIso,
        stripe_charge_id: tag,
      })
      break
    }

    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED': {
      const invoiceId = event.resource?.custom_id
      if (invoiceId) {
        await admin.from('invoices').update({ status: 'failed' }).eq('id', invoiceId).eq('status', 'pending')
      }
      break
    }

    case 'PAYMENT.CAPTURE.REFUNDED':
    case 'PAYMENT.CAPTURE.REVERSED': {
      const invoiceId = event.resource?.custom_id
      if (invoiceId) {
        await admin.from('invoices').update({ status: 'refunded' }).eq('id', invoiceId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
