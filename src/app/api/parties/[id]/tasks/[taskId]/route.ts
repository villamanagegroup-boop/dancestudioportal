import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id: partyId, taskId } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.done !== undefined) update.done = !!body.done
  if (body.title !== undefined) update.title = body.title
  if (body.sort_order !== undefined) update.sort_order = body.sort_order
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('party_tasks')
    .update(update)
    .eq('id', taskId)
    .eq('party_id', partyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id: partyId, taskId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('party_tasks')
    .delete()
    .eq('id', taskId)
    .eq('party_id', partyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
