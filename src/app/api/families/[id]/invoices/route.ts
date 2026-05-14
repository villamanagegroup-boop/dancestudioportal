import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const TYPES = new Set(['tuition', 'registration', 'costume', 'recital', 'retail', 'other'])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { description, amount, invoice_type, due_date, student_id, notes } = await req.json()
  const num = Number(amount)
  if (!description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 400 })
  if (!Number.isFinite(num) || num <= 0) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })
  const type = TYPES.has(invoice_type) ? invoice_type : 'other'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      guardian_id: id,
      student_id: student_id || null,
      invoice_type: type,
      description: description.trim(),
      amount: num,
      due_date: due_date || null,
      notes: notes || null,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'charge_added',
    meta: { invoice_id: data.id, amount: num, type },
  })

  return NextResponse.json({ ok: true, invoice_id: data.id })
}
