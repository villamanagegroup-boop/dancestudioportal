import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { camp_id, student_id } = await req.json()
  if (!camp_id || !student_id) {
    return NextResponse.json({ error: 'camp_id and student_id are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // Verify the signed-in guardian actually owns this student
  const { data: link } = await supabase
    .from('guardian_students')
    .select('id')
    .eq('guardian_id', user.id)
    .eq('student_id', student_id)
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'That student is not on your account' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: camp } = await admin
    .from('camps')
    .select('id, max_capacity, active, registration_open')
    .eq('id', camp_id)
    .single()
  if (!camp) {
    return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
  }
  if (!camp.active || !camp.registration_open) {
    return NextResponse.json({ error: 'Registration is closed for this camp' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('camp_registrations')
    .select('id')
    .eq('camp_id', camp_id)
    .eq('student_id', student_id)
    .not('status', 'eq', 'cancelled')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'This student is already registered' }, { status: 409 })
  }

  const { count } = await admin
    .from('camp_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('camp_id', camp_id)
    .eq('status', 'registered')

  const isFull = (count ?? 0) >= (camp.max_capacity ?? 0)
  let waitlistPosition: number | null = null
  if (isFull) {
    const { count: wl } = await admin
      .from('camp_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('camp_id', camp_id)
      .eq('status', 'waitlisted')
    waitlistPosition = (wl ?? 0) + 1
  }

  const { error } = await admin.from('camp_registrations').insert({
    camp_id,
    student_id,
    status: isFull ? 'waitlisted' : 'registered',
    waitlist_position: waitlistPosition,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, waitlisted: isFull }, { status: 201 })
}
