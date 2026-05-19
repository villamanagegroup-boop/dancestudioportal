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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const body = await request.json()
  if (!body.name || !body.style) {
    return NextResponse.json({ error: 'name and style required' }, { status: 400 })
  }
  const { data, error } = await auth.admin.from('class_types').insert({
    name: body.name,
    style: body.style,
    level: body.level ?? 'all_levels',
    min_age: body.min_age ?? null,
    max_age: body.max_age ?? null,
    description: body.description ?? null,
    color: body.color ?? '#6366f1',
    active: body.active ?? true,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
