'use client'

import { useState } from 'react'
import { Plus, CalendarCheck, ChevronUp, ChevronDown } from 'lucide-react'
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
  room: { name: string } | null
}

type SortKey = 'title' | 'date' | 'type' | 'price' | 'status'
type SortDir = 'asc' | 'desc'

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

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" /> : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

export default function BookingsTable({ bookings, rooms }: { bookings: Booking[]; rooms: { id: string; name: string }[] }) {
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const sorted = [...bookings].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortKey === 'date') cmp = a.booking_date.localeCompare(b.booking_date)
    else if (sortKey === 'type') cmp = a.booking_type.localeCompare(b.booking_type)
    else if (sortKey === 'price') cmp = Number(a.price) - Number(b.price)
    else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const cols: [SortKey, string][] = [['title', 'Booking'], ['date', 'Date'], ['type', 'Type'], ['price', 'Price'], ['status', 'Status']]

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
          >
            <Plus size={16} /> Add Booking
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <CalendarCheck size={32} className="text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-500">No bookings yet</p>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(b => (
                  <tr key={b.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="text-gray-400 ml-1">· {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span>
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
                    <td className="px-5 py-3 text-sm text-gray-500">{b.contact_name ?? '—'}</td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <RowActions
                        endpoint={`/api/bookings/${b.id}`}
                        entityLabel="booking"
                        archived={b.status === 'cancelled'}
                        archivePatch={{ status: 'cancelled' }}
                        restorePatch={{ status: 'confirmed' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <BookingFormModal onClose={() => setShowModal(false)} rooms={rooms} />}
    </>
  )
}
