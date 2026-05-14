import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { class_id, student_id } = await req.json()
  if (!class_id || !student_id) {
    return NextResponse.json({ error: 'class_id and student_id are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

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

  const { data: cls } = await admin
    .from('classes')
    .select('id, season_id, max_students, active, registration_open, internal_registration_only')
    .eq('id', class_id)
    .single()
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }
  if (!cls.active || !cls.registration_open || cls.internal_registration_only) {
    return NextResponse.json({ error: 'This class is not open for registration' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('class_id', class_id)
    .eq('student_id', student_id)
    .not('status', 'in', '(dropped,completed)')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'This student is already enrolled' }, { status: 409 })
  }

  const { count } = await admin
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', class_id)
    .eq('status', 'active')

  const isFull = (count ?? 0) >= (cls.max_students ?? 0)
  let waitlistPosition: number | null = null
  if (isFull) {
    const { count: wl } = await admin
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', class_id)
      .eq('status', 'waitlisted')
    waitlistPosition = (wl ?? 0) + 1
  }

  const { error } = await admin.from('enrollments').insert({
    class_id,
    student_id,
    season_id: cls.season_id,
    status: isFull ? 'waitlisted' : 'active',
    waitlist_position: waitlistPosition,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, waitlisted: isFull }, { status: 201 })
}
