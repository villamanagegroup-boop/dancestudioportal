import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import BookingsTable from '@/components/admin/BookingsTable'

export default async function BookingsPage() {
  const supabase = createAdminClient()

  const [{ data: bookings }, { data: rooms }] = await Promise.all([
    supabase.from('bookings').select(`
      id, title, contact_name, contact_email, contact_phone,
      booking_date, start_time, end_time, booking_type,
      price, status, notes, created_at,
      room:rooms(name)
    `).order('booking_date', { ascending: false }),
    supabase.from('rooms').select('id, name').eq('active', true),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Bookings" subtitle="Room rentals, private lessons, and rehearsals" />
      <div className="p-6">
        <BookingsTable bookings={(bookings ?? []) as any} rooms={rooms ?? []} />
      </div>
    </div>
  )
}
