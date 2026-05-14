import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEnrollmentConfirmation } from '@/lib/resend'
import { formatDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const studentId = searchParams.get('student_id')
  const seasonId = searchParams.get('season_id')
  const status = searchParams.get('status')

  let query = supabase.from('enrollments').select(`
    *, student:students(first_name, last_name),
    class:classes(name, day_of_week, start_time, monthly_tuition),
    season:seasons(name)
  `)

  if (classId) query = query.eq('class_id', classId)
  if (studentId) query = query.eq('student_id', studentId)
  if (seasonId) query = query.eq('season_id', seasonId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('enrolled_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()
  const { student_id, class_id, season_id, notes } = body

  // Check enrollment count vs capacity
  const { data: cls } = await supabase
    .from('classes').select('max_students, monthly_tuition, name, start_date, season:seasons(start_date)')
    .eq('id', class_id).single()

  const { count: enrolledCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', class_id)
    .eq('status', 'active')

  const isFull = cls && (enrolledCount ?? 0) >= cls.max_students
  let waitlistPosition: number | null = null

  if (isFull) {
    const { count: waitlistCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', class_id)
      .eq('status', 'waitlisted')
    waitlistPosition = (waitlistCount ?? 0) + 1
  }

  const { data: enrollment, error } = await supabase.from('enrollments').insert({
    student_id,
    class_id,
    season_id,
    notes,
    status: isFull ? 'waitlisted' : 'active',
    waitlist_position: waitlistPosition,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Send confirmation email if active
  if (!isFull) {
    try {
      const { data: guardian } = await supabase
        .from('guardian_students')
        .select('guardian:profiles(email, first_name, last_name)')
        .eq('student_id', student_id)
        .eq('is_primary', true)
        .single()

      const { data: student } = await supabase
        .from('students').select('first_name, last_name').eq('id', student_id).single()

      if (guardian?.guardian && student && cls) {
        const g = guardian.guardian as any
        await sendEnrollmentConfirmation({
          to: g.email,
          guardianName: `${g.first_name} ${g.last_name}`,
          studentName: `${student.first_name} ${student.last_name}`,
          className: cls.name,
          startDate: (cls.season as any)?.start_date ? formatDate((cls.season as any).start_date) : 'TBD',
          tuition: cls.monthly_tuition,
        })
      }
    } catch {}
  }

  return NextResponse.json(enrollment, { status: 201 })
}
