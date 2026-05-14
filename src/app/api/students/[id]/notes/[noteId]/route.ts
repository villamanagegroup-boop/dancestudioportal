import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params
  const { body, pinned, kind, visibility } = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof body === 'string') update.body = body.trim()
  if (typeof pinned === 'boolean') update.pinned = pinned
  if (kind === 'note' || kind === 'announcement') update.kind = kind
  if (visibility === 'admin' || visibility === 'parent') update.visibility = visibility

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_notes')
    .update(update)
    .eq('id', noteId)
    .eq('student_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_notes')
    .delete()
    .eq('id', noteId)
    .eq('student_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
