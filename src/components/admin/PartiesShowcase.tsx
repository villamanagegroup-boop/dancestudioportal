'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Calendar, MapPin, Plus, Ticket } from 'lucide-react'
import PartyFormModal from '@/components/forms/PartyFormModal'
import { formatCurrency } from '@/lib/utils'

interface Party {
  id: string
  contact_name: string
  contact_email: string | null
  event_date: string
  start_time: string
  end_time: string
  guest_count: number | null
  package: string | null
  price: number
  deposit_paid: boolean
  status: string
  notes: string | null
  room: { name: string } | null
}

const COVERS = ['photo-ph', 'photo-ph alt-1', 'photo-ph alt-2', 'photo-ph alt-3', 'photo-ph alt-4', 'photo-ph alt-5']

function daysUntil(dateStr: string) {
  const target = new Date(dateStr)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeLabel(t: string | null | undefined) {
  if (!t) return ''
  const [hh, mm] = t.split(':').map(Number)
  const hr = hh % 12 === 0 ? 12 : hh % 12
  return `${hr}:${String(mm ?? 0).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}

export default function PartiesShowcase({ parties, rooms }: { parties: Party[]; rooms: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [showModal, setShowModal] = useState(false)

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const sorted = useMemo(() => {
    const list = [...parties].sort((a, b) => a.event_date.localeCompare(b.event_date))
    if (tab === 'upcoming') return list.filter(p => new Date(p.event_date) >= today)
    if (tab === 'past') return [...list].reverse().filter(p => new Date(p.event_date) < today)
    return list
  }, [parties, tab, today])

  const featured = sorted[0]
  const rest = sorted.slice(1, 7)

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Studio events · 2026</div>
          <h1 className="h1">Parties, <span className="grad-text">recitals &amp; rentals</span></h1>
        </div>
        <div className="ml-auto flex gap-2 items-center flex-wrap">
          <div className="role-switch">
            {[
              { k: 'upcoming', l: 'Upcoming' },
              { k: 'past', l: 'Past' },
              { k: 'all', l: 'All' },
            ].map(({ k, l }) => (
              <button key={k} aria-pressed={tab === k} onClick={() => setTab(k as typeof tab)}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Book event
          </button>
        </div>
      </div>

      {!featured ? (
        <div className="glass card text-center" style={{ padding: '40px 20px', color: 'var(--ink-3)' }}>
          <p className="text-sm">No {tab === 'past' ? 'past' : tab === 'upcoming' ? 'upcoming' : ''} events {tab === 'upcoming' ? 'on the books' : 'recorded'}.</p>
        </div>
      ) : (
        <>
          {/* Featured event */}
          <div className="glass-strong" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius)' }}>
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]" style={{ minHeight: 320 }}>
              <div className={`photo ${COVERS[0]}`} style={{ borderRadius: 0 }} />
              <div style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <span className="chip" style={{ alignSelf: 'flex-start' }}>
                  <span className="dot-sm" style={{ background: 'var(--grad-3)' }} />
                  Featured {tab === 'upcoming' && daysUntil(featured.event_date) >= 0 ? `· ${daysUntil(featured.event_date)} day${daysUntil(featured.event_date) === 1 ? '' : 's'} away` : ''}
                </span>
                <h2 className="h1 serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
                  {featured.contact_name || 'Studio event'}
                </h2>
                <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {featured.notes ?? `Booked for ${featured.guest_count ?? 'open'} guests${featured.package ? ` · ${featured.package} package` : ''}.`}
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
                  <div><div className="eyebrow">Date</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{dateLabel(featured.event_date)}</div></div>
                  <div><div className="eyebrow">Time</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{timeLabel(featured.start_time)} – {timeLabel(featured.end_time)}</div></div>
                  <div><div className="eyebrow">Venue</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{featured.room?.name ?? 'TBD'}</div></div>
                  <div><div className="eyebrow">Price</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{formatCurrency(Number(featured.price))}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-primary"><Ticket size={14} /> View booking</button>
                  <span className={`tag ${featured.deposit_paid ? 'tag-mint' : 'tag-amber'}`} style={{ alignSelf: 'center' }}>
                    Deposit {featured.deposit_paid ? 'paid' : 'pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of next events */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((p, i) => (
                <div key={p.id} className="glass event-card">
                  <div className={`photo event-photo ${COVERS[(i + 1) % COVERS.length]}`} style={{ borderRadius: 0 }}>
                    <span className="tag" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,.95)', color: 'var(--ink-1)', backdropFilter: 'blur(8px)' }}>
                      {p.package ?? 'Event'}
                    </span>
                  </div>
                  <div className="event-body">
                    <div className="t">{p.contact_name || 'Studio event'}</div>
                    <div className="event-meta">
                      <span><Calendar size={13} />{dateLabel(p.event_date)}</span>
                      {p.room?.name && <span><MapPin size={13} />{p.room.name}</span>}
                    </div>
                    <div className="spread" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <span className={`tag ${p.status === 'confirmed' ? 'tag-blue' : p.status === 'completed' ? 'tag-mint' : p.status === 'cancelled' ? 'tag-amber' : 'tag-iris'}`} style={{ textTransform: 'capitalize' }}>
                        {p.status}
                      </span>
                      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(p.price))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && <PartyFormModal onClose={() => setShowModal(false)} rooms={rooms} />}
    </>
  )
}
