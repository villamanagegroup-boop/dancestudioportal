import { getPortalViewer } from '@/lib/portal-viewer'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { db, effectiveId } = await getPortalViewer('i')
  if (!effectiveId) {
    return NextResponse.json({ error: 'Sign in to delete hours.' }, { status: 401 })
  }

  // Only allow deleting your own unapproved entries
  const { data: entry } = await db
    .from('instructor_hours')
    .select('id, instructor_id, approved_at')
    .eq('id', id)
    .maybeSingle()

  if (!entry || entry.instructor_id !== effectiveId) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
  }
  if (entry.approved_at) {
    return NextResponse.json({ error: 'Approved entries cannot be deleted.' }, { status: 400 })
  }

  const { error } = await db.from('instructor_hours').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
