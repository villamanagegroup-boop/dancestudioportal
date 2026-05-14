'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import PartyFormModal from '@/components/forms/PartyFormModal'
import { cn } from '@/lib/utils'
import RowActions from '@/components/admin/RowActions'

interface Party {
  id: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  event_date: string
  start_time: string
  end_time: string
  guest_count: number | null
  package: string | null
  price: number
  amount_paid: number
  deposit_paid: boolean
  status: string
  notes: string | null
  created_at: string
  room: { name: string } | null
}

type SortKey = 'name' | 'date' | 'price' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" /> : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

export default function PartiesTable({ parties, rooms }: { parties: Party[]; rooms: { id: string; name: string }[] }) {
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const sorted = [...parties].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.contact_name.localeCompare(b.contact_name)
    else if (sortKey === 'date') cmp = a.event_date.localeCompare(b.event_date)
    else if (sortKey === 'price') cmp = Number(a.price) - Number(b.price)
    else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const cols: [SortKey, string][] = [['name', 'Contact'], ['date', 'Event Date'], ['price', 'Price'], ['status', 'Status']]

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">{parties.length} {parties.length === 1 ? 'event' : 'events'}</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
          >
            <Plus size={16} /> Book Party
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Sparkles size={32} className="text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-500">No parties or events booked</p>
              <p className="text-xs text-gray-400 mt-1">Birthday parties, studio rentals, and special events appear here.</p>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Guests</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(party => (
                  <tr key={party.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/parties/${party.id}`} className="text-sm font-medium text-gray-900 hover:text-studio-700">
                        {party.contact_name}
                      </Link>
                      {party.contact_email && <p className="text-xs text-gray-400">{party.contact_email}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {new Date(party.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="text-gray-400 ml-1">· {party.start_time?.slice(0,5)} – {party.end_time?.slice(0,5)}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(Number(party.price))}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', STATUS_COLORS[party.status] ?? 'bg-gray-100 text-gray-600')}>
                        {party.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{party.room?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{party.guest_count ?? '—'}</td>
                    <td className="px-5 py-3">
                      {(() => {
                        const price = Number(party.price) || 0
                        const paid = Number(party.amount_paid) || 0
                        const pct = price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0
                        return (
                          <div className="w-28">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">{formatCurrency(paid)}</span>
                              <span className={party.deposit_paid ? 'text-green-600' : 'text-yellow-600'}>
                                {party.deposit_paid ? 'Dep ✓' : 'Dep —'}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={pct >= 100 ? 'h-full bg-green-500' : 'h-full bg-studio-500'}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <RowActions
                        endpoint={`/api/parties/${party.id}`}
                        entityLabel="event"
                        archived={party.status === 'cancelled'}
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
      {showModal && <PartyFormModal onClose={() => setShowModal(false)} rooms={rooms} />}
    </>
  )
}
