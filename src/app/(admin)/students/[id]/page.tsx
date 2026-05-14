import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import StudentTabs from '@/components/admin/StudentTabs'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [
    { data: student },
    { data: enrollments },
    { data: invoices },
    { data: guardians },
    { data: notes },
    { data: campRegistrations },
    { data: parties },
    { data: appointments },
    { data: policies },
    { data: acceptances },
    { data: memberships },
    { data: activity },
    { data: instructors },
  ] = await Promise.all([
    supabase.from('students').select('*').eq('id', id).single(),
    supabase.from('enrollments').select(`
      id, status, enrolled_at, dropped_at,
      class:classes(name, day_of_week, start_time, end_time, monthly_tuition)
    `).eq('student_id', id).order('enrolled_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('guardian_students').select(`
      relationship, is_primary,
      guardian:profiles(first_name, last_name, email, phone)
    `).eq('student_id', id),
    supabase.from('student_notes').select('id, body, pinned, kind, visibility, created_at').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('camp_registrations').select(`
      id, status, paid_at,
      camp:camps(id, name, start_date, end_date, price)
    `).eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('parties').select('id, event_date, start_time, end_time, package, price, status, deposit_paid')
      .eq('student_id', id).order('event_date', { ascending: false }),
    supabase.from('student_appointments').select(`
      id, appointment_type, title, scheduled_at, duration_minutes, location, status, notes,
      instructor:instructors(first_name, last_name)
    `).eq('student_id', id).order('scheduled_at', { ascending: false }),
    supabase.from('policies').select('*').eq('active', true).order('name'),
    supabase.from('student_policy_acceptances').select('policy_id, accepted_at, policy_version').eq('student_id', id),
    supabase.from('student_memberships').select('id, tier, starts_on, ends_on, notes, created_at').eq('student_id', id).order('starts_on', { ascending: false }),
    supabase.from('student_activity_log').select(`
      id, action, meta, created_at,
      actor:profiles!student_activity_log_actor_id_fkey(first_name, last_name)
    `).eq('student_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('last_name'),
  ])

  if (!student) notFound()

  const acceptanceMap = new Map((acceptances ?? []).map(a => [a.policy_id, a]))
  const mergedPolicies = (policies ?? []).map(p => ({ ...p, acceptance: acceptanceMap.get(p.id) ?? null }))

  return (
    <div className="flex flex-col h-full">
      <Header title={`${student.first_name} ${student.last_name}`} subtitle="Dancer profile" />
      <div className="p-6">
        <StudentTabs
          student={student as any}
          enrollments={(enrollments ?? []) as any}
          invoices={(invoices ?? []) as any}
          guardians={(guardians ?? []) as any}
          notes={(notes ?? []) as any}
          campRegistrations={(campRegistrations ?? []) as any}
          parties={(parties ?? []) as any}
          appointments={(appointments ?? []) as any}
          policies={mergedPolicies as any}
          memberships={(memberships ?? []) as any}
          activity={(activity ?? []) as any}
          instructors={(instructors ?? []) as any}
        />
      </div>
    </div>
  )
}
