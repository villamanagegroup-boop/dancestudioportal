'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, Music, Building2, CalendarDays } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import PartyFormModal from '@/components/forms/PartyFormModal'
import RowActions from '@/components/admin/RowActions'

type EventType = 'party' | 'recital' | 'rental'

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

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const SECTIONS: {
  type: EventType
  title: string
  addLabel: string
  icon: React.ElementType
  empty: string
}[] = [
  { type: 'party', title: 'Parties', addLabel: 'Book Party', icon: Sparkles, empty: 'No parties booked yet' },
  { type: 'recital', title: 'Recitals', addLabel: 'Add Recital', icon: Music, empty: 'No recitals scheduled yet' },
  { type: 'rental', title: 'Rentals', addLabel: 'Add Rental', icon: Building2, empty: 'No rentals booked yet' },
]

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateLabel(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
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

  const byType = (type: EventType) => {
    const list = parties.filter(p => (p.event_type ?? 'party') === type)
    const upcoming = list
      .filter(p => p.event_date >= today && p.status !== 'cancelled')
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
    const past = list
      .filter(p => p.event_date < today || p.status === 'cancelled')
      .sort((a, b) => b.event_date.localeCompare(a.event_date))
    return { list, upcoming, past }
  }

  return (
    <div className="space-y-8">
      {/* Dashboard summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SECTIONS.map(({ type, title, icon: Icon }) => {
          const { upcoming } = byType(type)
          const next = upcoming[0]
          return (
            <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-studio-50 flex items-center justify-center">
                  <Icon size={16} className="text-studio-600" />
                </span>
                <span className="text-sm font-semibold text-gray-700">{title}</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {upcoming.length}
                <span className="text-sm font-normal text-gray-400"> upcoming</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <CalendarDays size={12} />
                {next ? `Next: ${dateLabel(next.event_date)}` : 'Nothing on the books'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Sections */}
      {SECTIONS.map(({ type, title, addLabel, icon: Icon, empty }) => {
        const { upcoming, past } = byType(type)
        const rows = [...upcoming, ...past]
        return (
          <section key={type}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Icon size={17} className="text-studio-600" /> {title}
              </h2>
              <button
                onClick={() => setAddType(type)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
              >
                <Plus size={16} /> {addLabel}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {rows.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-center">
                  <Icon size={28} className="text-gray-300" />
                  <p className="text-sm text-gray-400">{empty}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {rows.map(p => {
                    const isPast = p.event_date < today || p.status === 'cancelled'
                    return (
                      <div
                        key={p.id}
                        className={cn('group flex items-center gap-4 px-5 py-3 hover:bg-gray-50', isPast && 'opacity-60')}
                      >
                        <div className="w-28 shrink-0">
                          <p className="text-sm font-medium text-gray-900">{dateLabel(p.event_date)}</p>
                          <p className="text-xs text-gray-400">
                            {timeLabel(p.start_time)} – {timeLabel(p.end_time)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/parties/${p.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-studio-700"
                          >
                            {p.contact_name || 'Untitled'}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {p.room?.name ?? 'No room'}
                            {p.guest_count ? ` · ${p.guest_count} guests` : ''}
                            {p.package ? ` · ${p.package}` : ''}
                          </p>
                        </div>
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full capitalize shrink-0',
                          STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600',
                        )}>
                          {p.status}
                        </span>
                        <span className="text-sm font-medium text-gray-900 w-20 text-right shrink-0">
                          {formatCurrency(Number(p.price))}
                        </span>
                        <div className="shrink-0">
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
          </section>
        )
      })}

      {addType && (
        <PartyFormModal onClose={() => setAddType(null)} rooms={rooms} eventType={addType} />
      )}
    </div>
  )
}
