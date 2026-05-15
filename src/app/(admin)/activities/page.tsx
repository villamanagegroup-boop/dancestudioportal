import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import ActivitiesDashboard from '@/components/admin/ActivitiesDashboard'

export default async function ActivitiesPage() {
  const supabase = createAdminClient()
  const d = new Date()
  const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const [
    { count: activeClasses },
    { count: activeCamps },
    { data: enrollmentStatuses },
    { data: recentEnrollments },
    { data: upcomingCamps },
  ] = await Promise.all([
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('camps').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('enrollments').select('status'),
    supabase
      .from('enrollments')
      .select('id, status, enrolled_at, student:students(first_name, last_name), class:classes(name)')
      .order('enrolled_at', { ascending: false })
      .limit(6),
    supabase
      .from('camps')
      .select('id, name, start_date, end_date, max_capacity')
      .gte('end_date', todayIso)
      .eq('active', true)
      .order('start_date')
      .limit(6),
  ])

  const statuses = enrollmentStatuses ?? []
  const stats = {
    activeClasses: activeClasses ?? 0,
    activeCamps: activeCamps ?? 0,
    totalEnrollments: statuses.length,
    activeEnrollments: statuses.filter(e => e.status === 'active').length,
    waitlisted: statuses.filter(e => e.status === 'waitlisted').length,
    pending: statuses.filter(e => e.status === 'pending').length,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Activities" subtitle="Classes, camps, and enrollments at a glance" />
      <div className="p-6 overflow-y-auto">
        <ActivitiesDashboard
          stats={stats}
          recentEnrollments={(recentEnrollments ?? []) as any}
          upcomingCamps={(upcomingCamps ?? []) as any}
        />
      </div>
    </div>
  )
}
