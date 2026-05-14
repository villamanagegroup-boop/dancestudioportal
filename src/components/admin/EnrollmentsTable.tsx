'use client'

import { useState } from 'react'
import { cn, formatDate, getEnrollmentStatusColor } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortKey = 'student' | 'class' | 'season' | 'enrolled' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

interface Enrollment {
  id: string
  status: string
  enrolled_at: string
  waitlist_position: number | null
  student: { first_name: string; last_name: string } | null
  class: { name: string; day_of_week: string } | null
  season: { name: string } | null
}

interface Props {
  enrollments: Enrollment[]
  seasons: { id: string; name: string }[]
}

const STATUS_OPTIONS = ['all', 'active', 'waitlisted', 'dropped', 'completed', 'pending']

export default function EnrollmentsTable({ enrollments, seasons }: Props) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('enrolled')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = enrollments
    .filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      let av = '', bv = ''
      if (sortKey === 'student') { av = a.student ? `${a.student.last_name} ${a.student.first_name}` : ''; bv = b.student ? `${b.student.last_name} ${b.student.first_name}` : '' }
      else if (sortKey === 'class') { av = a.class?.name ?? ''; bv = b.class?.name ?? '' }
      else if (sortKey === 'season') { av = a.season?.name ?? ''; bv = b.season?.name ?? '' }
      else if (sortKey === 'enrolled') { av = a.enrolled_at; bv = b.enrolled_at }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
        >
          <option value="all">All Seasons</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <span className="text-sm text-gray-600">{selected.size} selected</span>
            <button className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
              Send Email
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded text-studio-600"
                />
              </th>
              {([['student', 'Student'], ['class', 'Class'], ['season', 'Season'], ['enrolled', 'Enrolled'], ['status', 'Status']] as [SortKey, string][]).map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    className="rounded text-studio-600"
                  />
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'}
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{e.class?.name ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{e.season?.name ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{formatDate(e.enrolled_at)}</td>
                <td className="px-5 py-3">
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>
                    {e.status}
                    {e.status === 'waitlisted' && e.waitlist_position ? ` #${e.waitlist_position}` : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">No enrollments found</div>
        )}
      </div>
    </div>
  )
}
