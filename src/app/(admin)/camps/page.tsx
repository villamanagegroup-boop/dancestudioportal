import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CampsTable from '@/components/admin/CampsTable'

export default async function CampsPage() {
  const supabase = createAdminClient()

  const [{ data: camps }, { data: instructors }, { data: rooms }] = await Promise.all([
    supabase.from('camps').select(`
      id, name, description, start_date, end_date, start_time, end_time,
      max_capacity, price, age_min, age_max, active, created_at,
      instructor:instructors(first_name, last_name),
      room:rooms(name)
    `).order('start_date', { ascending: false }),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true),
    supabase.from('rooms').select('id, name').eq('active', true),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Camps" subtitle="Summer camps and intensive programs" />
      <div className="p-6">
        <CampsTable
          camps={(camps ?? []) as any}
          instructors={instructors ?? []}
          rooms={rooms ?? []}
        />
      </div>
    </div>
  )
}
