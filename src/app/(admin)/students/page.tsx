import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import StudentsTable from '@/components/admin/StudentsTable'

export default async function StudentsPage() {
  const supabase = createAdminClient()
  const [{ data: students, error }, { data: families }] = await Promise.all([
    supabase
      .from('students')
      .select(`
        id, first_name, last_name, date_of_birth, active,
        guardian_students(
          guardian:profiles(first_name, last_name, email)
        )
      `)
      .order('last_name'),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'parent')
      .eq('active', true)
      .order('last_name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Students" subtitle="Manage student profiles and enrollments" />
      <div className="p-6">
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            Error loading students: {error.message}
          </div>
        ) : (
          <StudentsTable students={(students ?? []) as any} families={families ?? []} />
        )}
      </div>
    </div>
  )
}
