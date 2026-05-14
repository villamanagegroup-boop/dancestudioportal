import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const STATUS = ['registered', 'waitlisted', 'cancelled', 'completed']
const PAYMENT = ['unpaid', 'deposit', 'paid', 'refunded', 'waived']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const { id: campId, regId } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
    if (body.status === 'registered') update.waitlist_position = null
  }
  if (body.payment_status !== undefined) {
    if (!PAYMENT.includes(body.payment_status)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
    }
    update.payment_status = body.payment_status
  }
  if (body.amount_paid !== undefined) {
    update.amount_paid = Number(body.amount_paid) || 0
  }
  if (body.waitlist_position !== undefined) update.waitlist_position = body.waitlist_position
  if (body.notes !== undefined) update.notes = body.notes || null
  if (body.archived !== undefined) update.archived = !!body.archived

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('camp_registrations')
    .update(update)
    .eq('id', regId)
    .eq('camp_id', campId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const { id: campId, regId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('camp_registrations')
    .delete()
    .eq('id', regId)
    .eq('camp_id', campId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
