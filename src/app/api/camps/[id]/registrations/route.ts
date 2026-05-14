import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campId } = await params
  const { student_id, notes } = await req.json()
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: camp, error: campErr } = await supabase
    .from('camps')
    .select('id, max_capacity')
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

  return NextResponse.json({ ...data, waitlisted: isFull }, { status: 201 })
}
