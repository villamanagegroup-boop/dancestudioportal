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
      <div className="p-6">
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error.message}</div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
                Add Instructor
              </button>
            </div>
            <StaffGrid instructors={instructors ?? []} />
          </div>
        )}
      </div>
    </div>
  )
}
