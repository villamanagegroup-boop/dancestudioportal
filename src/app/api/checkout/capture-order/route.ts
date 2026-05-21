import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { captureOrder } from '@/lib/paypal'

type ContactInput = { name?: string; email?: string; phone?: string; marketingOptIn?: boolean }

// Public: captures an approved PayPal order, records the payment, and (opt-in)
// saves a lightweight contact. The charged amount is taken from PayPal's
// capture response, never the client.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { orderId, slug, contact, description, lineItems } = body as {
    orderId?: string
    slug?: string
    contact?: ContactInput
    description?: string
    lineItems?: unknown
  }

  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const admin = createAdminClient()

  // Resolve the link (public) or require admin (staff ad-hoc).
  let linkId: string | null = null
  let recordDesc: string | null = description ? String(description) : null
  let recordLineItems: unknown = Array.isArray(lineItems) ? lineItems : []
  let collectContact = true
  let source: 'public' | 'staff' = 'public'
  let takenBy: string | null = null

  if (slug) {
    const { data: link } = await admin
      .from('checkout_links')
      .select('id, title, line_items, collect_contact')
      .eq('slug', slug)
      .maybeSingle()
    if (!link) return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    linkId = link.id
    recordDesc = link.title
    recordLineItems = link.line_items ?? []
    collectContact = !!link.collect_contact
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    source = 'staff'
    takenBy = user.id
    recordDesc = recordDesc || 'Payment'
  }

  // Capture the funds.
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

  // Optional lightweight contact capture (de-duped by email).
  let contactId: string | null = null
  if (collectContact && contact && (contact.email || contact.name || contact.phone)) {
    const email = contact.email?.trim() || null
    const payload = {
      name: contact.name?.trim() || null,
      email,
      phone: contact.phone?.trim() || null,
      marketing_opt_in: !!contact.marketingOptIn,
      updated_at: new Date().toISOString(),
    }
    if (email) {
      const { data: existing } = await admin
        .from('checkout_contacts')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      if (existing) {
        await admin.from('checkout_contacts').update(payload).eq('id', existing.id)
        contactId = existing.id
      } else {
        const { data: inserted } = await admin
          .from('checkout_contacts')
          .insert(payload)
          .select('id')
          .single()
        contactId = inserted?.id ?? null
      }
    } else {
      const { data: inserted } = await admin
        .from('checkout_contacts')
        .insert(payload)
        .select('id')
        .single()
      contactId = inserted?.id ?? null
    }
  }

  await admin.from('checkout_payments').insert({
    link_id: linkId,
    contact_id: contactId,
    description: recordDesc,
    line_items: recordLineItems,
    amount: capturedAmount,
    currency: captured?.amount?.currency_code ?? 'USD',
    provider: 'paypal',
    paypal_order_id: orderId,
    paypal_capture_id: captureId,
    source,
    taken_by: takenBy,
    status: 'paid',
  })

  return NextResponse.json({ ok: true, amount: capturedAmount })
}
