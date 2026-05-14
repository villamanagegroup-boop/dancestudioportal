import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { body, pinned, kind } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'note body required' }, { status: 400 })
  const noteKind = kind === 'announcement' ? 'announcement' : 'note'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('family_notes')
    .insert({ guardian_id: id, body: body.trim(), pinned: !!pinned, kind: noteKind })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: noteKind === 'announcement' ? 'announcement_added' : 'note_added',
    meta: { note_id: data.id },
  })

  return NextResponse.json({ note: data })
}
