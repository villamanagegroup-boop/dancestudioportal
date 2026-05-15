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
      <Header title="Events" subtitle="Birthday parties, recitals, and studio events" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Calendar</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                What&apos;s on the studio calendar — parties, recitals, and events.
              </p>
            </div>
            <EventsDashboard parties={(parties ?? []) as any} rooms={rooms ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
