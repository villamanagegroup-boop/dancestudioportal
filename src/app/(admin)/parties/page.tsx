import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import EventsDashboard from '@/components/admin/EventsDashboard'

export default async function PartiesPage() {
  const supabase = createAdminClient()

  const [{ data: parties }, { data: rooms }] = await Promise.all([
    supabase.from('parties').select(`
      id, contact_name, event_type, event_date, start_time, end_time,
      guest_count, package, price, amount_paid, deposit_paid, status,
      room:rooms(name)
    `).order('event_date', { ascending: false }),
    supabase.from('rooms').select('id, name').eq('active', true),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Parties & Events" subtitle="Birthday parties, recitals, and studio rentals" />
      <div className="p-6 overflow-y-auto">
        <EventsDashboard parties={(parties ?? []) as any} rooms={rooms ?? []} />
      </div>
    </div>
  )
}
