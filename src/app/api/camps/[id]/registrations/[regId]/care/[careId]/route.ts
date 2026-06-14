import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { requireStaff } from '@/lib/require-staff'

// PATCH /api/camps/[id]/registrations/[regId]/care/[careId]
// Mark paid/unpaid or tweak a care line. paid → stamps paid_at.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ careId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { careId } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.paid !== undefined) {
    update.paid = !!body.paid
    update.paid_at = body.paid ? new Date().toISOString() : null
  }
  if (body.notes !== undefined) update.notes = body.notes || null
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('camp_care')
    .update(update)
    .eq('id', careId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (body.paid !== undefined) {
    await logActivity({
      action: body.paid ? 'camp_care.paid' : 'camp_care.unpaid',
      targetTable: 'camp_care',
      targetId: careId,
      targetLabel: `${data.kind} care · $${Number(data.amount).toFixed(2)}`,
      metadata: { registration_id: data.registration_id },
    }, supabase)
  }
  return NextResponse.json({ care: data })
}

// DELETE /api/camps/[id]/registrations/[regId]/care/[careId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ careId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { careId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('camp_care').delete().eq('id', careId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
