import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const INVOICE_FIELDS = ['description', 'amount', 'due_date', 'invoice_type', 'status', 'notes', 'student_id'] as const
const NULLABLE_WHEN_BLANK = new Set(['due_date', 'notes', 'student_id'])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const f of INVOICE_FIELDS) {
    if (f in body) {
      const v = body[f]
      update[f] = NULLABLE_WHEN_BLANK.has(f) && (v === '' || v === undefined) ? null : v
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  if (body.status === 'paid') {
    const { data: inv } = await supabase
      .from('invoices')
      .select('guardian_id, amount, paid_at')
      .eq('id', id)
      .single()
    update.paid_at = new Date().toISOString()
    if (inv && !inv.paid_at) {
      await supabase.from('payments').insert({
        invoice_id: id,
        guardian_id: inv.guardian_id,
        amount: body.amount ?? inv.amount,
        notes: 'Recorded from billing dashboard',
      })
    }
  } else if (body.status && body.status !== 'paid') {
    update.paid_at = null
  }

  const { error } = await supabase.from('invoices').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  await supabase.from('payments').delete().eq('invoice_id', id)
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
