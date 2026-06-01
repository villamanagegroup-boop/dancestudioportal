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
// Phase 2a supports only `dismiss`. Matching / conversion actions land in
// later phases and intentionally are NOT handled here.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')

  if (action !== 'dismiss') {
    return NextResponse.json({ error: `Unsupported action: ${action || '(none)'}` }, { status: 400 })
  }

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
