import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: 'Not signed in' }
  const admin = createAdminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { ok: false as const, status: 403, message: 'Admins only' }
  return { ok: true as const, admin }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  if ('name' in body) update.name = body.name
  if ('start_date' in body) update.start_date = body.start_date
  if ('end_date' in body) update.end_date = body.end_date
  if ('tuition_due_day' in body) update.tuition_due_day = body.tuition_due_day
  if ('active' in body) update.active = body.active
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })
  const { error } = await auth.admin.from('seasons').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const { error } = await auth.admin.from('seasons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
