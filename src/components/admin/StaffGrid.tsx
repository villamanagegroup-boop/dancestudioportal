'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Plus, Search, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, isStaffRole } from '@/lib/permissions'
import RowActions from '@/components/admin/RowActions'
import StaffFormModal from '@/components/forms/StaffFormModal'
import KpiStrip from '@/components/admin/KpiStrip'

interface Instructor {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  bio: string | null
  specialties: string[] | null
  pay_rate: number | null
  pay_type: string | null
  staff_role: string | null
  background_check_date: string | null
  background_check_expires: string | null
  active: boolean
}

type SortKey = 'name' | 'email'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'active' | 'inactive' | 'all'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const ms = new Date(dateStr + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000)
}

function bgStatus(d: number | null): 'expired' | 'expiring' | 'ok' | 'none' {
  if (d === null) return 'none'
  if (d < 0) return 'expired'
  if (d <= 60) return 'expiring'
  return 'ok'
}

function SortBtn({ col, label, activeKey, dir, onToggle }: {
  col: SortKey; label: string; activeKey: SortKey; dir: SortDir; onToggle: (col: SortKey) => void
}) {
  return (
    <button onClick={() => onToggle(col)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
      {label}
      {activeKey === col
        ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        : <ChevronUp size={12} className="text-gray-300" />}
    </button>
  )
}

export default function StaffGrid({ instructors }: { instructors: Instructor[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Instructor | null>(null)

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('asc') }
  }

  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0
    for (const i of instructors) {
      if (i.active) active++
      const s = bgStatus(daysUntil(i.background_check_expires))
      if (s === 'expiring') expiring++
      if (s === 'expired') expired++
    }
    return { total: instructors.length, active, expiring, expired }
  }, [instructors])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return instructors.filter(i => {
      if (statusFilter === 'active' && !i.active) return false
      if (statusFilter === 'inactive' && i.active) return false
      if (q && !(`${i.first_name} ${i.last_name} ${i.email}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [instructors, query, statusFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'name' ? `${a.last_name} ${a.first_name}` : a.email
      const bv = sortKey === 'name' ? `${b.last_name} ${b.first_name}` : b.email
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const selectCls = 'px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

  return (
    <>
      <KpiStrip items={[
        { label: 'Total staff', value: String(stats.total) },
        { label: 'Active', value: String(stats.active) },
        { label: 'BG check expiring', value: String(stats.expiring) },
        { label: 'BG check expired', value: String(stats.expired) },
      ]} />

      <hr className="section-rule" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className={selectCls}>
          <option value="active">Active</option>
          <option value="inactive">Archived</option>
          <option value="all">All</option>
        </select>
        <div className="flex gap-3 items-center text-xs text-gray-500">
          Sort:
          <SortBtn col="name" label="Name" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
          <SortBtn col="email" label="Email" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
        >
          <Plus size={16} /> Add Instructor
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm shadow-sm">
          No instructors match
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(instructor => {
            const days = daysUntil(instructor.background_check_expires)
            const bg = bgStatus(days)
            return (
              <div key={instructor.id} className="relative">
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => setEditing(instructor)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Edit instructor"
                  >
                    <Pencil size={15} />
                  </button>
                  <RowActions
                    endpoint={`/api/instructors/${instructor.id}`}
                    entityLabel="instructor"
                    archived={!instructor.active}
                    archivePatch={{ active: false }}
                    restorePatch={{ active: true }}
                  />
                </div>
                <Link href={`/staff/${instructor.id}`}>
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-lg mb-3">
                      {instructor.first_name[0]}{instructor.last_name[0]}
                    </div>
                    <h3 className="font-semibold text-gray-900 pr-16">
                      {instructor.first_name} {instructor.last_name}
                      {!instructor.active && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{instructor.email}</p>
                    <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-studio-50 text-studio-700">
                      {isStaffRole(instructor.staff_role) ? ROLE_LABELS[instructor.staff_role] : 'Instructor'}
                    </span>
                    {instructor.specialties && instructor.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {instructor.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-studio-50 text-studio-700 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      {bg === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <ShieldAlert size={12} /> BG check expired
                        </span>
                      )}
                      {bg === 'expiring' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <ShieldAlert size={12} /> BG check expires in {days}d
                        </span>
                      )}
                      {bg === 'ok' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={12} /> BG check current
                        </span>
                      )}
                      {bg === 'none' && (
                        <span className="text-xs text-gray-400">No background check on file</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <StaffFormModal onClose={() => setShowAdd(false)} />}
      {editing && <StaffFormModal onClose={() => setEditing(null)} instructor={editing} />}
    </>
  )
}
