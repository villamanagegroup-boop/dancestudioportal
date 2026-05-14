import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { amount, invoice_id, method_last_four, paid_at, notes } = await req.json()
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      guardian_id: id,
      invoice_id: invoice_id || null,
      amount: num,
      payment_method_last_four: method_last_four || null,
      paid_at: paid_at || new Date().toISOString(),
      notes: notes || null,
    })
    .select('id')
    .single()
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 })

  // If applied to a specific invoice, mark it paid (when payment fully covers amount)
  if (invoice_id) {
    const { data: inv } = await supabase.from('invoices').select('amount, status').eq('id', invoice_id).single()
    if (inv && Number(inv.amount) <= num && inv.status !== 'paid') {
      await supabase.from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoice_id)
    }
  }

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'payment_recorded',
    meta: { payment_id: payment.id, amount: num, invoice_id: invoice_id ?? null },
  })

  return NextResponse.json({ ok: true, payment_id: payment.id })
}
