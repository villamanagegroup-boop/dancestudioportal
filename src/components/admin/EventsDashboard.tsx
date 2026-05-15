'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, Music, CalendarHeart } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import PartyFormModal from '@/components/forms/PartyFormModal'
import KpiStrip from '@/components/admin/KpiStrip'
import RowActions from '@/components/admin/RowActions'

type EventType = 'party' | 'recital' | 'event'

interface Party {
  id: string
  contact_name: string
  event_type: EventType
  event_date: string
  start_time: string
  end_time: string
  price: number
  amount_paid: number
  deposit_paid: boolean
  status: string
  guest_count: number | null
  package: string | null
  room: { name: string } | null
}

interface Props {
  parties: Party[]
  rooms: { id: string; name: string }[]
}

const STATUS_TAG: Record<string, string> = {
  inquiry: 'tag tag-blue',
  confirmed: 'tag tag-iris',
  completed: 'tag tag-mint',
  cancelled: 'tag tag-amber',
}

const SECTIONS: { type: EventType; title: string; addLabel: string; icon: React.ElementType; empty: string }[] = [
  { type: 'party', title: 'Parties', addLabel: 'Book party', icon: Sparkles, empty: 'No parties booked yet' },
  { type: 'recital', title: 'Recitals', addLabel: 'Add recital', icon: Music, empty: 'No recitals scheduled yet' },
  { type: 'event', title: 'Studio events', addLabel: 'Add event', icon: CalendarHeart, empty: 'No studio events scheduled yet' },
]

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateLabel(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeLabel(t: string | null | undefined) {
  if (!t) return ''
  const [hh, mm] = t.split(':').map(Number)
  const hr = hh % 12 === 0 ? 12 : hh % 12
  return `${hr}:${String(mm ?? 0).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}

export default function EventsDashboard({ parties, rooms }: Props) {
  const [addType, setAddType] = useState<EventType | null>(null)
  const today = todayIso()

  function byType(type: EventType) {
    const list = parties.filter(p => (p.event_type ?? 'party') === type)
    const upcoming = list
      .filter(p => p.event_date >= today && p.status !== 'cancelled')
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
    const past = list
      .filter(p => p.event_date < today || p.status === 'cancelled')
      .sort((a, b) => b.event_date.localeCompare(a.event_date))
    return { upcoming, past }
  }

  const kpis = SECTIONS.map(s => {
    const { upcoming } = byType(s.type)
    const next = upcoming[0]
    return {
      label: s.title,
      value: String(upcoming.length),
      sub: next ? `Next · ${dateLabel(next.event_date)}` : 'Nothing on the books',
    }
  })

  return (
    <div>
      <KpiStrip items={kpis} />

      {SECTIONS.map(({ type, title, addLabel, icon: Icon, empty }, sectionIdx) => {
        const { upcoming, past } = byType(type)
        const rows = [...upcoming, ...past]
        return (
          <div key={type}>
            <hr className="section-rule" />
            <div className="eyebrow-row">
              <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon size={12} /> {title}
              </span>
              <button
                onClick={() => setAddType(type)}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={13} /> {addLabel}
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>{empty}</p>
            ) : (
              <div className="tight-list">
                {rows.map(p => {
                  const isPast = p.event_date < today || p.status === 'cancelled'
                  return (
                    <div key={p.id} className="tl-row" style={isPast ? { opacity: 0.5 } : undefined}>
                      <div className="tl-lead">
                        <div className="t">{dateLabel(p.event_date)}</div>
                        <div className="s">{timeLabel(p.start_time)}{p.end_time ? ` – ${timeLabel(p.end_time)}` : ''}</div>
                      </div>
                      <div className="tl-main">
                        <Link href={`/parties/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <div className="t">{p.contact_name || 'Untitled'}</div>
                          <div className="s">
                            {p.room?.name ?? 'No room'}
                            {p.guest_count ? ` · ${p.guest_count} guests` : ''}
                            {p.package ? ` · ${p.package}` : ''}
                          </div>
                        </Link>
                      </div>
                      <div className="tl-trail">
                        <span className={cn(STATUS_TAG[p.status] ?? 'tag tag-blue', 'capitalize')}>{p.status}</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink-1)', minWidth: 60, textAlign: 'right' }}>
                          {formatCurrency(Number(p.price))}
                        </span>
                        <RowActions
                          endpoint={`/api/parties/${p.id}`}
                          entityLabel={type}
                          archived={p.status === 'cancelled'}
                          archivePatch={{ status: 'cancelled' }}
                          restorePatch={{ status: 'confirmed' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {addType && (
        <PartyFormModal onClose={() => setAddType(null)} rooms={rooms} eventType={addType} />
      )}
    </div>
  )
}
