import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUS = ['active', 'waitlisted', 'dropped', 'completed', 'pending']

export async function POST(req: NextRequest) {
  const { ids, action, status, classId } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No enrollments selected' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (action === 'delete') {
    const { error } = await supabase.from('enrollments').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, affected: ids.length })
  }

  if (action === 'archive' || action === 'restore') {
    const { error } = await supabase
      .from('enrollments')
      .update({ archived: action === 'archive' })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, affected: ids.length })
  }

  if (action === 'status') {
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const patch: Record<string, unknown> = { status }
    if (status === 'dropped') patch.dropped_at = new Date().toISOString()
    else patch.dropped_at = null
    if (status === 'active') patch.waitlist_position = null
    const { error } = await supabase.from('enrollments').update(patch).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, affected: ids.length })
  }

  if (action === 'transfer') {
    if (!classId) {
      return NextResponse.json({ error: 'Target class is required' }, { status: 400 })
    }
    const { data: target } = await supabase
      .from('classes')
      .select('id, season_id')
      .eq('id', classId)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'Target class not found' }, { status: 400 })
    }
    const { error } = await supabase
      .from('enrollments')
      .update({ class_id: target.id, season_id: target.season_id })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, affected: ids.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
