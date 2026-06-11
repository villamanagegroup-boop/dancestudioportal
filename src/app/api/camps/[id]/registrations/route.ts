import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campId } = await params
  const { student_id, notes } = await req.json()
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: camp, error: campErr } = await supabase
    .from('camps')
    .select('id, max_capacity, name')
    .eq('id', campId)
    .single()
  if (campErr || !camp) {
    return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('camp_registrations')
    .select('id, status')
    .eq('camp_id', campId)
    .eq('student_id', student_id)
    .not('status', 'eq', 'cancelled')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Student is already registered for this camp' }, { status: 409 })
  }

  const { count } = await supabase
    .from('camp_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('camp_id', campId)
    .eq('status', 'registered')

  const isFull = (count ?? 0) >= (camp.max_capacity ?? 0)
  let waitlistPosition: number | null = null
  if (isFull) {
    const { count: wl } = await supabase
      .from('camp_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('camp_id', campId)
      .eq('status', 'waitlisted')
    waitlistPosition = (wl ?? 0) + 1
  }

  const { data, error } = await supabase
    .from('camp_registrations')
    .insert({
      camp_id: campId,
      student_id,
      status: isFull ? 'waitlisted' : 'registered',
      waitlist_position: waitlistPosition,
      notes: notes || null,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: student } = await supabase
    .from('students').select('first_name, last_name').eq('id', student_id).maybeSingle()
  const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : null
  await logActivity({
    action: isFull ? 'camp_registration.waitlisted' : 'camp_registration.created',
    targetTable: 'camp_registrations',
    targetId: data.id,
    targetLabel: studentName && camp.name ? `${studentName} → ${camp.name}` : studentName,
    metadata: { camp_id: campId, student_id, waitlisted: isFull, waitlist_position: waitlistPosition },
  }, supabase)

  await notify({
    type: isFull ? 'camp_registration.waitlisted' : 'camp_registration.created',
    title: isFull ? 'New camp waitlist' : 'New camp registration',
    body: studentName && camp.name
      ? `${studentName} ${isFull ? 'waitlisted for' : 'registered for'} ${camp.name}`
      : 'A camper was registered',
    href: `/camps/${campId}`,
    metadata: { camp_id: campId, student_id, waitlisted: isFull },
  }, supabase)

  return NextResponse.json({ ...data, waitlisted: isFull }, { status: 201 })
}
