import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { createOrder, captureOrder, paypalConfigured } from '@/lib/paypal'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'

// POST /api/paypal/charge-saved — staff charges a family's vaulted PayPal card.
// Body: { guardian_id, payment_method_id, invoice_id?, amount?, description? }
//  - invoice_id  → charges that open invoice for its amount
//  - amount      → charges a custom one-off amount (a paid invoice is created)
// This is a merchant-initiated charge (the cardholder isn't present); it relies
// on the consent captured when the card was vaulted.
export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!paypalConfigured()) return NextResponse.json({ error: 'PayPal is not configured.' }, { status: 503 })

  const admin = auth.admin
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const guardianId = typeof body.guardian_id === 'string' ? body.guardian_id : ''
  const paymentMethodId = typeof body.payment_method_id === 'string' && body.payment_method_id ? body.payment_method_id : null
  const invoiceId = typeof body.invoice_id === 'string' && body.invoice_id ? body.invoice_id : null
  const customAmount = body.amount != null && body.amount !== '' ? Number(body.amount) : null
  const customDescription = typeof body.description === 'string' ? body.description.trim() : ''

  if (!guardianId) {
    return NextResponse.json({ error: 'guardian_id is required' }, { status: 400 })
  }

  // Resolve the vaulted token: the named card, or the family's default
  // chargeable PayPal card when none is specified (one-click from the dashboard).
  let methodQuery = admin
    .from('payment_methods')
    .select('paypal_token_id, paypal_customer_id, last_four, card_brand')
    .eq('guardian_id', guardianId)
  if (paymentMethodId) {
    methodQuery = methodQuery.eq('id', paymentMethodId)
  } else {
    methodQuery = methodQuery
      .eq('provider', 'paypal')
      .not('paypal_token_id', 'is', null)
      .order('is_default', { ascending: false })
      .limit(1)
  }
  const { data: method } = await methodQuery.maybeSingle()
  if (!method?.paypal_token_id) {
    return NextResponse.json(
      { error: paymentMethodId ? 'That card has no saved PayPal token and can\'t be charged.' : 'No chargeable card on file for this family.' },
      { status: 400 },
    )
  }

  // Resolve amount + the invoice this charge settles.
  let invoiceRow: { id: string; amount: number; description: string } | null = null
  if (invoiceId) {
    const { data: inv } = await admin
      .from('invoices')
      .select('id, amount, description, status, guardian_id')
      .eq('id', invoiceId)
      .maybeSingle()
    if (!inv || inv.guardian_id !== guardianId) {
      return NextResponse.json({ error: 'Invoice not found for this family' }, { status: 404 })
    }
    if (inv.status === 'paid') {
      return NextResponse.json({ error: 'That invoice is already paid' }, { status: 409 })
    }
    invoiceRow = { id: inv.id, amount: Number(inv.amount), description: inv.description }
  } else {
    if (!customAmount || !Number.isFinite(customAmount) || customAmount <= 0) {
      return NextResponse.json({ error: 'Enter an invoice or a charge amount greater than 0' }, { status: 400 })
    }
    const description = customDescription || 'Studio charge'
    const { data: newInv, error: invErr } = await admin
      .from('invoices')
      .insert({
        guardian_id: guardianId,
        amount: customAmount,
        description,
        invoice_type: 'other',
        status: 'pending',
      })
      .select('id, amount, description')
      .single()
    if (invErr || !newInv) {
      return NextResponse.json({ error: invErr?.message ?? 'Could not create the charge' }, { status: 400 })
    }
    invoiceRow = { id: newInv.id, amount: Number(newInv.amount), description: newInv.description }
  }

  // Charge the vaulted card, then capture server-side (buyer not present).
  let captureId: string | null = null
  try {
    const orderId = await createOrder({
      amount: invoiceRow.amount,
      description: invoiceRow.description,
      invoiceId: invoiceRow.id,
      savedTokenId: method.paypal_token_id,
      customerId: method.paypal_customer_id ?? null,
    })
    const capture = await captureOrder(orderId)
    if (capture?.status && capture.status !== 'COMPLETED') {
      throw new Error(`PayPal returned status ${capture.status}`)
    }
    captureId = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? orderId
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'The card was declined or the charge failed.' }, { status: 402 })
  }

  // Record the payment + settle the invoice.
  const nowIso = new Date().toISOString()
  const { data: payment } = await admin
    .from('payments')
    .insert({
      guardian_id: guardianId,
      invoice_id: invoiceRow.id,
      amount: invoiceRow.amount,
      payment_method_last_four: method.last_four ?? null,
      paid_at: nowIso,
      notes: `Charged card on file (${method.card_brand ?? 'card'} ••${method.last_four ?? '????'}) by staff`,
    })
    .select('id')
    .single()

  await admin.from('invoices').update({ status: 'paid', paid_at: nowIso }).eq('id', invoiceRow.id)

  const { data: guardian } = await admin
    .from('profiles').select('first_name, last_name').eq('id', guardianId).maybeSingle()
  const guardianName = guardian ? `${guardian.first_name ?? ''} ${guardian.last_name ?? ''}`.trim() || null : null

  await logActivity({
    action: 'payment.recorded',
    targetTable: 'payments',
    targetId: payment?.id ?? null,
    targetLabel: guardianName,
    metadata: { amount: invoiceRow.amount, invoice_id: invoiceRow.id, method: 'card_on_file', capture_id: captureId },
  }, admin)

  await notify({
    type: 'payment.recorded',
    title: 'Card on file charged',
    body: `${guardianName ?? 'A family'} · $${invoiceRow.amount.toFixed(2)}`,
    href: `/families/${guardianId}`,
    metadata: { amount: invoiceRow.amount, guardian_id: guardianId, invoice_id: invoiceRow.id },
  }, admin)

  return NextResponse.json({ ok: true, capture_id: captureId, amount: invoiceRow.amount })
}
