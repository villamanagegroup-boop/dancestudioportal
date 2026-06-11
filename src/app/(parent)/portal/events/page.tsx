import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate } from '@/lib/utils'
import SectionHead from '@/components/admin/SectionHead'
import RequestEventCard from '@/components/portal/RequestEventCard'

export const dynamic = 'force-dynamic'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface EventItem {
  key: string
  date: string
  title: string
  kind: string
  note: string | null
}

export default async function ParentEventsPage() {
  const { db } = await getPortalViewer('g')
  const today = todayIso()

  // Studio-wide events parents should see: calendar "event" entries + recitals /
  // studio events from the parties table. Private birthday parties (event_type
  // 'party') are intentionally excluded — those belong to one family.
  const [{ data: calEvents }, { data: studioParties }] = await Promise.all([
    db.from('calendar_events')
      .select('id, title, event_type, start_date, notes')
      .eq('event_type', 'event')
      .gte('start_date', today)
      .order('start_date')
      .limit(50),
    db.from('parties')
      .select('id, event_type, event_date, status')
      .in('event_type', ['recital', 'event'])
      .neq('status', 'cancelled')
      .gte('event_date', today)
      .order('event_date')
      .limit(50),
  ])

  const events: EventItem[] = [
    ...(calEvents ?? []).map((e: any): EventItem => ({
      key: `c-${e.id}`, date: e.start_date, title: e.title, kind: 'Studio event', note: e.notes ?? null,
    })),
    ...(studioParties ?? []).map((p: any): EventItem => ({
      key: `p-${p.id}`, date: p.event_date,
      title: p.event_type === 'recital' ? 'Recital' : 'Studio event',
      kind: p.event_type === 'recital' ? 'Recital' : 'Studio event', note: null,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1))

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Events</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Studio events & celebrations.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {events.length
            ? `${events.length} upcoming event${events.length === 1 ? '' : 's'} on the calendar.`
            : 'No studio events on the calendar right now — request one below.'}
        </p>
      </div>

      <SectionHead label="Upcoming" />
      {events.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nothing scheduled yet.</p>
      ) : (
        <div className="tight-list">
          {events.map(e => (
            <div key={e.key} className="tl-row">
              <div className="tl-lead">
                <div className="t">{formatDate(e.date).replace(/, \d{4}$/, '')}</div>
              </div>
              <div className="tl-main">
                <div className="t">{e.title}</div>
                {e.note && <div className="s">{e.note}</div>}
              </div>
              <div className="tl-trail">
                <span className="tag tag-iris">{e.kind}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Host with us" />
      <div className="max-w-lg">
        <RequestEventCard />
      </div>
    </div>
  )
}
