import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import SubNavCards from '@/components/admin/SubNavCards'
import KpiStrip from '@/components/admin/KpiStrip'
import { formatCurrency } from '@/lib/utils'
import { Sparkles, Music, CalendarHeart, CalendarCheck, CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EVENT_LABEL: Record<string, string> = { party: 'Party', recital: 'Recital', event: 'Studio event' }
const BOOKING_LABEL: Record<string, string> = { rental: 'Rental', private_lesson: 'Private lesson', rehearsal: 'Rehearsal', other: 'Booking' }

function dateLabel(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function timeLabel(t: string | null | undefined) {
  if (!t) return ''
  const [hh, mm] = t.split(':').map(Number)
  const hr = hh % 12 === 0 ? 12 : hh % 12
  return `${hr}:${String(mm ?? 0).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}

export default async function EventsHubPage() {
  const supabase = createAdminClient()
  const today = todayIso()

  const [{ data: parties }, { data: bookings }] = await Promise.all([
    supabase.from('parties')
      .select('id, contact_name, event_type, event_date, start_time, price, status, room:rooms(name)')
      .order('event_date', { ascending: true }),
    supabase.from('bookings')
      .select('id, title, booking_type, booking_date, start_time, price, status, room:rooms(name)')
      .order('booking_date', { ascending: true }),
  ])

  const allParties = parties ?? []
  const allBookings = bookings ?? []

  const upParties = allParties.filter(p => p.event_date >= today && p.status !== 'cancelled')
  const upBookings = allBookings.filter(b => b.booking_date >= today && b.status !== 'cancelled')

  const count = (type: string) => upParties.filter(p => (p.event_type ?? 'party') === type).length
  const revenue = [...allParties, ...allBookings]
    .filter((x: any) => x.status === 'confirmed' || x.status === 'completed')
    .reduce((s, x: any) => s + Number(x.price || 0), 0)

  // Merge everything upcoming into one chronological "next up" feed.
  type Up = { key: string; href: string; date: string; time: string | null; title: string; kind: string; room: string | null }
  const feed: Up[] = [
    ...upParties.map((p: any): Up => ({
      key: `p-${p.id}`, href: `/parties/${p.id}`, date: p.event_date, time: p.start_time,
      title: p.contact_name || EVENT_LABEL[p.event_type ?? 'party'] || 'Event',
      kind: EVENT_LABEL[p.event_type ?? 'party'] ?? 'Event', room: p.room?.name ?? null,
    })),
    ...upBookings.map((b: any): Up => ({
      key: `b-${b.id}`, href: '/bookings', date: b.booking_date, time: b.start_time,
      title: b.title, kind: BOOKING_LABEL[b.booking_type] ?? 'Booking', room: b.room?.name ?? null,
    })),
  ].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))).slice(0, 10)

  return (
    <div className="flex flex-col h-full">
      <Header title="Events" subtitle="Parties, recitals, studio events, and bookings" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Overview</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                Everything on the studio calendar in one place.
              </p>
            </div>

            <SubNavCards cards={[
              { href: '/parties', icon: Sparkles, label: 'Parties & Recitals', desc: 'Birthday parties, recitals & studio events' },
              { href: '/bookings', icon: CalendarCheck, label: 'Bookings', desc: 'Rentals, private lessons & rehearsals' },
              { href: '/calendar', icon: CalendarDays, label: 'Calendar', desc: 'See it all on the schedule' },
            ]} />

            <KpiStrip items={[
              { label: 'Upcoming parties', value: String(count('party')) },
              { label: 'Upcoming recitals', value: String(count('recital')) },
              { label: 'Studio events', value: String(count('event')) },
              { label: 'Upcoming bookings', value: String(upBookings.length) },
              { label: 'Booked revenue', value: formatCurrency(revenue) },
            ]} />

            <hr className="section-rule" />

            <div className="eyebrow-row">
              <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CalendarHeart size={12} /> Next up
              </span>
            </div>
            {feed.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Nothing on the books yet.</p>
            ) : (
              <div className="tight-list">
                {feed.map(item => (
                  <Link key={item.key} href={item.href} className="tl-row" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div className="tl-lead">
                      <div className="t">{dateLabel(item.date)}</div>
                      <div className="s">{timeLabel(item.time)}</div>
                    </div>
                    <div className="tl-main">
                      <div className="t">{item.title}</div>
                      <div className="s">{item.kind}{item.room ? ` · ${item.room}` : ''}</div>
                    </div>
                    <div className="tl-trail">
                      <span className="tag tag-iris">{item.kind}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
