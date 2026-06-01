import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { admin, userId: user.id }
}

// PATCH /api/intake/[id] — triage actions on a site_intake row.
// Phase 2a: `dismiss`. Phase 2b: `match` (link to an existing family — no
// record creation). Conversion actions land in later phases.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')

  if (action === 'dismiss') {
    const admin_notes = typeof body.admin_notes === 'string' && body.admin_notes.trim()
      ? body.admin_notes.trim()
      : null

    const { error } = await ctx.admin
      .from('site_intake')
      .update({
        status: 'dismissed',
        admin_notes,
        processed_at: new Date().toISOString(),
        processed_by: ctx.userId,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'match') {
    const profile_id = typeof body.profile_id === 'string' ? body.profile_id : ''
    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }
    // The matched family's student ids, so later phases (2c/2d) can use them.
    const student_ids = Array.isArray(body.student_ids)
      ? body.student_ids.filter((x: unknown): x is string => typeof x === 'string')
      : []

    // Match only links the row — it deliberately does NOT mutate profiles,
    // students, or any child record, and does not mark the row processed
    // (a matched row still flows into the conversion phases).
    const { error } = await ctx.admin
      .from('site_intake')
      .update({
        status: 'matched',
        linked_profile_id: profile_id,
        linked_student_ids: student_ids,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: `Unsupported action: ${action || '(none)'}` }, { status: 400 })
}
