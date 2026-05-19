import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MANAGEABLE = new Set(['admin', 'instructor', 'partner'])

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: 'Not signed in' }
  const admin = createAdminClient()
  const { data: caller } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { ok: false as const, status: 403, message: 'Admins only' }
  return { ok: true as const, admin }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params

  const [{ data: profile }, { data: instructor }, { data: partner }, { data: hasStudents }] = await Promise.all([
    auth.admin.from('profiles').select('id, role, first_name, last_name, email').eq('id', id).maybeSingle(),
    auth.admin.from('instructors').select('id, active').eq('profile_id', id).maybeSingle(),
    auth.admin.from('partners').select('id, active, name').eq('profile_id', id).maybeSingle(),
    auth.admin.from('guardian_students').select('id').eq('guardian_id', id).limit(1).maybeSingle(),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({
    profile,
    entitlements: {
      admin: profile.role === 'admin',
      instructor: !!(instructor && instructor.active),
      partner: !!(partner && partner.active),
      parent: profile.role === 'parent' || !!hasStudents,
    },
    linkedRows: {
      instructor: instructor ?? null,
      partner: partner ?? null,
    },
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params

  const body = (await request.json()) as { role?: string; action?: 'add' | 'remove' }
  const role = body.role
  const action = body.action
  if (!role || !MANAGEABLE.has(role)) {
    return NextResponse.json({ error: `Role must be one of: ${[...MANAGEABLE].join(', ')}` }, { status: 400 })
  }
  if (action !== 'add' && action !== 'remove') {
    return NextResponse.json({ error: 'action must be "add" or "remove"' }, { status: 400 })
  }

  const { data: profile } = await auth.admin
    .from('profiles').select('id, first_name, last_name, email, role').eq('id', id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (role === 'admin') {
    if (action === 'add') {
      await auth.admin.from('profiles').update({ role: 'admin' }).eq('id', id)
    } else {
      // Demote: infer next-best role from existing linkages.
      const { data: instr } = await auth.admin.from('instructors').select('id').eq('profile_id', id).eq('active', true).maybeSingle()
      const { data: partn } = await auth.admin.from('partners').select('id').eq('profile_id', id).eq('active', true).maybeSingle()
      const nextRole = instr ? 'instructor' : partn ? 'partner' : 'parent'
      await auth.admin.from('profiles').update({ role: nextRole }).eq('id', id)
    }
    return NextResponse.json({ ok: true })
  }

  if (role === 'instructor') {
    const { data: existing } = await auth.admin
      .from('instructors').select('id').eq('profile_id', id).maybeSingle()
    if (action === 'add') {
      if (existing) {
        await auth.admin.from('instructors').update({ active: true }).eq('id', existing.id)
      } else {
        await auth.admin.from('instructors').insert({
          profile_id: id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          active: true,
        })
      }
    } else {
      if (existing) {
        await auth.admin.from('instructors').update({ active: false }).eq('id', existing.id)
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (role === 'partner') {
    const { data: existing } = await auth.admin
      .from('partners').select('id').eq('profile_id', id).maybeSingle()
    if (action === 'add') {
      if (existing) {
        await auth.admin.from('partners').update({ active: true }).eq('id', existing.id)
      } else {
        await auth.admin.from('partners').insert({
          profile_id: id,
          name: `${profile.first_name} ${profile.last_name}`.trim() || 'New partner',
          contact_name: `${profile.first_name} ${profile.last_name}`.trim(),
          email: profile.email,
          partner_type: 'business',
          active: true,
        })
      }
    } else {
      if (existing) {
        await auth.admin.from('partners').update({ active: false }).eq('id', existing.id)
      }
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unhandled role' }, { status: 400 })
}
