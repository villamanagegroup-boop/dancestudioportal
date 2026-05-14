import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import EnrollmentsTable from '@/components/admin/EnrollmentsTable'

export default async function EnrollmentsPage() {
  const supabase = createAdminClient()
  const [{ data: enrollments }, { data: seasons }] = await Promise.all([
    supabase.from('enrollments').select(`
      id, status, enrolled_at, waitlist_position,
      student:students(first_name, last_name),
      class:classes(name, day_of_week),
      season:seasons(name)
    `).order('enrolled_at', { ascending: false }),
    supabase.from('seasons').select('id, name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Enrollments" subtitle="Manage all student enrollments" />
      <div className="p-6">
        <EnrollmentsTable
          enrollments={(enrollments ?? []) as any}
          seasons={seasons ?? []}
        />
      </div>
    </div>
  )
}
