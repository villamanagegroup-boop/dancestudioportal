import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import StaffGrid from '@/components/admin/StaffGrid'

export default async function StaffPage() {
  const supabase = createAdminClient()
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('*')
    .order('last_name')

  return (
    <div className="flex flex-col h-full">
      <Header title="Staff" subtitle="Instructors and staff management" />
      <div className="p-6 overflow-y-auto">
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error.message}</div>
        ) : (
          <StaffGrid instructors={instructors ?? []} />
        )}
      </div>
    </div>
  )
}
