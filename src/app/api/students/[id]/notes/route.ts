import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { body, pinned, kind, visibility } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'note body required' }, { status: 400 })
  const noteKind = kind === 'announcement' ? 'announcement' : 'note'
  const noteVis = visibility === 'parent' ? 'parent' : 'admin'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_notes')
    .insert({ student_id: id, body: body.trim(), pinned: !!pinned, kind: noteKind, visibility: noteVis })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ note: data })
}
