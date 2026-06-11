'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Tent, ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import CampFormModal from '@/components/forms/CampFormModal'
import RowActions from '@/components/admin/RowActions'
import BulkEditBar, { type BulkField } from '@/components/admin/BulkEditBar'
import { useRowSelection } from '@/components/admin/useRowSelection'

interface Camp {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  max_capacity: number
  price: number
  age_min: number | null
  age_max: number | null
  active: boolean
  created_at: string
  instructor: { first_name: string; last_name: string } | null
  room: { name: string } | null
}

interface Props {
  camps: Camp[]
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  regCounts: Record<string, number>
}

type SortKey = 'name' | 'start' | 'price' | 'capacity'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" /> : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

function statusOf(camp: Camp) {
  const now = new Date().toISOString().slice(0, 10)
  if (!camp.active) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }
  if (camp.end_date < now) return { label: 'Completed', cls: 'bg-gray-100 text-gray-600' }
  if (camp.start_date > now) return { label: 'Upcoming', cls: 'bg-sky-100 text-sky-700' }
  return { label: 'Active', cls: 'bg-green-100 text-green-700' }
}

export default function CampsTable({ camps, instructors, rooms, regCounts }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('start')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const { selected, toggle, setMany, clear } = useRowSelection()

  const bulkFields: BulkField[] = [
    { key: 'start_date', label: 'Start date', type: 'date' },
    { key: 'end_date', label: 'End date', type: 'date' },
    { key: 'start_time', label: 'Start time', type: 'time' },
    { key: 'end_time', label: 'End time', type: 'time' },
    { key: 'price', label: 'Price', type: 'currency', placeholder: '0.00' },
    { key: 'deposit_amount', label: 'Deposit', type: 'currency', placeholder: '0.00' },
    { key: 'max_capacity', label: 'Max capacity', type: 'number' },
    { key: 'age_min', label: 'Min age', type: 'number' },
    { key: 'age_max', label: 'Max age', type: 'number' },
    { key: 'instructor_id', label: 'Instructor', type: 'select', options: instructors.map(i => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })) },
    { key: 'room_id', label: 'Room', type: 'select', options: rooms.map(r => ({ value: r.id, label: r.name })) },
    { key: 'registration_open', label: 'Registration open', type: 'boolean' },
    { key: 'active', label: 'Active', type: 'boolean' },
  ]

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const sorted = [...camps].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'start') cmp = a.start_date.localeCompare(b.start_date)
    else if (sortKey === 'price') cmp = Number(a.price) - Number(b.price)
    else if (sortKey === 'capacity') cmp = a.max_capacity - b.max_capacity
    return sortDir === 'asc' ? cmp : -cmp
  })

  const cols: [SortKey, string][] = [['name', 'Camp'], ['start', 'Dates'], ['price', 'Price'], ['capacity', 'Capacity']]

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">{camps.length} {camps.length === 1 ? 'camp' : 'camps'}</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
          >
            <Plus size={16} /> Add Camp
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Tent size={32} className="text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-500">No camps yet</p>
              <p className="text-xs text-gray-400 mt-1">Add summer camps and intensive programs here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all camps"
                      checked={sorted.length > 0 && sorted.every(c => selected.has(c.id))}
                      ref={el => { if (el) el.indeterminate = sorted.some(c => selected.has(c.id)) && !sorted.every(c => selected.has(c.id)) }}
                      onChange={e => setMany(sorted.map(c => c.id), e.target.checked)}
                      className="rounded border-gray-300 text-studio-600 focus:ring-studio-500"
                    />
                  </th>
                  {cols.map(([col, label]) => (
                    <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ages</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Instructor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(camp => {
                  const status = statusOf(camp)
                  return (
                    <tr key={camp.id} className={`group hover:bg-gray-50 ${selected.has(camp.id) ? 'bg-studio-50/50' : ''}`}>
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select ${camp.name}`}
                          checked={selected.has(camp.id)}
                          onChange={() => toggle(camp.id)}
                          className="rounded border-gray-300 text-studio-600 focus:ring-studio-500"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/camps/${camp.id}`} className="text-sm font-medium text-gray-900 hover:text-studio-700">
                          {camp.name}
                        </Link>
                        {camp.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{camp.description}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {new Date(camp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' – '}
                        {new Date(camp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(Number(camp.price))}</td>
                      <td className="px-5 py-3">
                        {(() => {
                          const count = regCounts[camp.id] ?? 0
                          const pct = camp.max_capacity > 0
                            ? Math.min(100, Math.round((count / camp.max_capacity) * 100))
                            : 0
                          return (
                            <div className="w-28">
                              <div className="text-xs text-gray-600 mb-1">{count} / {camp.max_capacity}</div>
                              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={pct >= 100 ? 'h-full bg-red-500' : 'h-full bg-studio-500'}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {camp.age_min && camp.age_max ? `${camp.age_min}–${camp.age_max} yrs` : camp.age_min ? `${camp.age_min}+ yrs` : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {camp.instructor ? `${camp.instructor.first_name} ${camp.instructor.last_name}` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                        <RowActions
                          endpoint={`/api/camps/${camp.id}`}
                          entityLabel="camp"
                          archived={!camp.active}
                          archivePatch={{ active: false }}
                          restorePatch={{ active: true }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <CampFormModal onClose={() => setShowModal(false)} instructors={instructors} rooms={rooms} />}
      <BulkEditBar
        ids={[...selected]}
        endpointBase="/api/camps"
        entityLabel="camp"
        fields={bulkFields}
        onClear={clear}
      />
    </>
  )
}
