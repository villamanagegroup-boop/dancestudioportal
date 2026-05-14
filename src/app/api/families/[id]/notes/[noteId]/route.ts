import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params
  const { body, pinned } = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof body === 'string') update.body = body.trim()
  if (typeof pinned === 'boolean') update.pinned = pinned

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('family_notes')
    .update(update)
    .eq('id', noteId)
    .eq('guardian_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('family_notes')
    .delete()
    .eq('id', noteId)
    .eq('guardian_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'note_deleted',
    meta: { note_id: noteId },
  })

  return NextResponse.json({ ok: true })
}
