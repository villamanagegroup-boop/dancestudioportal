import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import PartiesShowcase from '@/components/admin/PartiesShowcase'
import PartiesTable from '@/components/admin/PartiesTable'

export default async function PartiesPage() {
  const supabase = createAdminClient()

  const [{ data: parties }, { data: rooms }] = await Promise.all([
    supabase.from('parties').select(`
      id, contact_name, contact_email, contact_phone,
      event_date, start_time, end_time, guest_count, package,
      price, deposit_paid, status, notes, created_at,
      room:rooms(name)
    `).order('event_date', { ascending: false }),
    supabase.from('rooms').select('id, name').eq('active', true),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Parties & Events" subtitle="Birthday parties, recitals, and studio rentals" />
      <div className="p-6 space-y-6 overflow-y-auto">
        <PartiesShowcase parties={(parties ?? []) as any} rooms={rooms ?? []} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>All bookings</div>
          <PartiesTable parties={(parties ?? []) as any} rooms={rooms ?? []} />
        </div>
      </div>
    </div>
  )
}
