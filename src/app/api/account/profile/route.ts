import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, phone, role')
    .eq('id', user.id)
    .single()
  return NextResponse.json({ profile })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = (await request.json()) as { first_name?: string; last_name?: string; phone?: string }
  const update: Record<string, unknown> = {}
  if (typeof body.first_name === 'string') update.first_name = body.first_name.trim()
  if (typeof body.last_name === 'string') update.last_name = body.last_name.trim()
  if (typeof body.phone === 'string') update.phone = body.phone.trim() || null
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
