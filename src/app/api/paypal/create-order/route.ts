import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrder } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  // Read the authoritative amount from the invoice — never trust a client amount.
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, amount, description, status, guardian_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.guardian_id !== user.id) {
    return NextResponse.json({ error: 'Not your invoice' }, { status: 403 })
  }
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 409 })
  }

  try {
    const orderId = await createOrder(Number(invoice.amount), invoice.description, invoice.id)
    return NextResponse.json({ orderId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'PayPal error' }, { status: 500 })
  }
}
