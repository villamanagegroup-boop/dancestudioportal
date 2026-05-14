import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import EnrollmentsTable from '@/components/admin/EnrollmentsTable'

export default async function EnrollmentsPage() {
  const supabase = createAdminClient()
  const [
    { data: enrollments },
    { data: seasons },
    { data: classes },
    { data: students },
    { data: campRegistrations },
  ] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select(`
          id, status, enrolled_at, dropped_at, waitlist_position, notes, season_id, archived,
          student:students(id, first_name, last_name),
          class:classes(id, name, day_of_week, max_students, monthly_tuition, billing_type, flat_amount),
          season:seasons(name)
        `)
        .order('enrolled_at', { ascending: false }),
      supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
      supabase
        .from('classes')
        .select('id, name, day_of_week, max_students, monthly_tuition, billing_type, flat_amount, season_id')
        .eq('active', true)
        .order('name'),
      supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('active', true)
        .order('last_name'),
      supabase
        .from('camp_registrations')
        .select(`
          id, status, payment_status, registered_at,
          student:students(first_name, last_name),
          camp:camps(id, name)
        `)
        .order('registered_at', { ascending: false }),
    ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Enrollments" subtitle="Manage all student enrollments" />
      <div className="p-6">
        <EnrollmentsTable
          enrollments={(enrollments ?? []) as any}
          seasons={seasons ?? []}
          classes={(classes ?? []) as any}
          students={students ?? []}
          campRegistrations={(campRegistrations ?? []) as any}
        />
      </div>
    </div>
  )
}
