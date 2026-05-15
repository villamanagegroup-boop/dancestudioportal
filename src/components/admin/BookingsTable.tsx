'use client'

import { useState, useMemo } from 'react'
import { Plus, CalendarCheck, ChevronUp, ChevronDown, Search, Pencil } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import BookingFormModal from '@/components/forms/BookingFormModal'
import RowActions from '@/components/admin/RowActions'

interface Booking {
  id: string
  title: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  booking_date: string
  start_time: string
  end_time: string
  booking_type: string
  price: number
  status: string
  notes: string | null
  created_at: string
  room_id: string | null
  room: { name: string } | null
  partner_id: string | null
  partner: { name: string } | null
}

type SortKey = 'title' | 'date' | 'type' | 'price' | 'status'
type SortDir = 'asc' | 'desc'
type Scope = 'upcoming' | 'past' | 'all'

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const TYPE_LABELS: Record<string, string> = {
  rental: 'Room Rental',
  private_lesson: 'Private Lesson',
  rehearsal: 'Rehearsal',
  other: 'Other',
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

export default function BookingsTable({ bookings, rooms, partners }: {
  bookings: Booking[]
  rooms: { id: string; name: string }[]
  partners: { id: string; name: string }[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [scope, setScope] = useState<Scope>('upcoming')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  const today = todayIso()

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('asc') }
  }

  const stats = useMemo(() => {
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndIso = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
    const upcoming = bookings.filter(b => b.booking_date >= today && b.status !== 'cancelled')
    const thisWeek = upcoming.filter(b => b.booking_date <= weekEndIso)
    const revenue = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.price || 0), 0)
    return { total: bookings.length, upcoming: upcoming.length, thisWeek: thisWeek.length, revenue }
  }, [bookings, today])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter(b => {
      if (scope === 'upcoming' && (b.booking_date < today || b.status === 'cancelled')) return false
      if (scope === 'past' && b.booking_date >= today && b.status !== 'cancelled') return false
      if (typeFilter && b.booking_type !== typeFilter) return false
      if (statusFilter && b.status !== statusFilter) return false
      if (roomFilter && b.room_id !== roomFilter) return false
      if (q && !(`${b.title} ${b.contact_name ?? ''} ${b.contact_email ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [bookings, scope, typeFilter, statusFilter, roomFilter, query, today])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortKey === 'date') cmp = a.booking_date.localeCompare(b.booking_date)
      else if (sortKey === 'type') cmp = a.booking_type.localeCompare(b.booking_type)
      else if (sortKey === 'price') cmp = Number(a.price) - Number(b.price)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const cols: [SortKey, string][] = [['title', 'Booking'], ['date', 'Date'], ['type', 'Type'], ['price', 'Price'], ['status', 'Status']]
  const selectCls = 'px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Bookings" value={String(stats.total)} />
        <StatCard label="Upcoming" value={String(stats.upcoming)} />
        <StatCard label="Next 7 Days" value={String(stats.thisWeek)} />
        <StatCard label="Booked Revenue" value={formatCurrency(stats.revenue)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
            {(['upcoming', 'past', 'all'] as Scope[]).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                  scope === s ? 'bg-white text-studio-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or contact…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
            />
          </div>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">All Statuses</option>
            <option value="inquiry">Inquiry</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className={selectCls}>
            <option value="">All Rooms</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
          >
            <Plus size={16} /> Add Booking
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <CalendarCheck size={32} className="text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-500">No bookings match</p>
              <p className="text-xs text-gray-400 mt-1">Room rentals, private lessons, and rehearsals appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {cols.map(([col, label]) => (
                    <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Room</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Partner</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(b => (
                  <tr key={b.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <button onClick={() => setEditing(b)} className="text-sm font-medium text-gray-900 hover:text-studio-700 text-left">
                        {b.title}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="text-gray-400 ml-1">· {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {TYPE_LABELS[b.booking_type] ?? b.booking_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(Number(b.price))}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600')}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{b.room?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{b.partner?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{b.contact_name ?? '—'}</td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          aria-label="Edit booking"
                        >
                          <Pencil size={15} />
                        </button>
                        <RowActions
                          endpoint={`/api/bookings/${b.id}`}
                          entityLabel="booking"
                          archived={b.status === 'cancelled'}
                          archivePatch={{ status: 'cancelled' }}
                          restorePatch={{ status: 'confirmed' }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <BookingFormModal onClose={() => setShowAdd(false)} rooms={rooms} partners={partners} />}
      {editing && <BookingFormModal onClose={() => setEditing(null)} rooms={rooms} partners={partners} booking={editing} />}
    </>
  )
}
