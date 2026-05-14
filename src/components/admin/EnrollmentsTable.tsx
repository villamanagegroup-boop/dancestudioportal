'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronUp, ChevronDown, Trash2, ArrowUpCircle, Plus, Mail, Search,
  ArrowRightLeft, Archive, ArchiveRestore, Tent,
} from 'lucide-react'
import { cn, formatDate, formatCurrency, getEnrollmentStatusColor } from '@/lib/utils'
import GroupEnrollModal, { type ClassOption } from '@/components/forms/GroupEnrollModal'
import BulkTransferModal from '@/components/forms/BulkTransferModal'
import EnrollmentEmailModal from '@/components/forms/EnrollmentEmailModal'
import DropEnrollmentModal from '@/components/forms/DropEnrollmentModal'

type SortKey = 'student' | 'class' | 'season' | 'enrolled' | 'status'
type SortDir = 'asc' | 'desc'
type Mode = 'all' | 'waitlist' | 'camps'

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
  dropped_at: string | null
  waitlist_position: number | null
  notes: string | null
  season_id: string | null
  archived: boolean
  student: { id: string; first_name: string; last_name: string } | null
  class: {
    id: string
    name: string
    day_of_week: string
    max_students: number
    monthly_tuition: number
    billing_type: string
    flat_amount: number | null
  } | null
  season: { name: string } | null
}

interface CampReg {
  id: string
  status: string
  payment_status: string
  registered_at: string
  student: { first_name: string; last_name: string } | null
  camp: { id: string; name: string } | null
}

interface Props {
  enrollments: Enrollment[]
  seasons: { id: string; name: string }[]
  classes: ClassOption[]
  students: { id: string; first_name: string; last_name: string }[]
  campRegistrations: CampReg[]
}

const STATUS_OPTIONS = ['all', 'active', 'waitlisted', 'dropped', 'completed', 'pending']
const SETTABLE_STATUSES = ['active', 'waitlisted', 'pending', 'completed', 'dropped']
const CAMP_STATUSES = ['registered', 'waitlisted', 'cancelled', 'completed']
const CAMP_PAYMENTS = ['unpaid', 'deposit', 'paid', 'refunded', 'waived']
const CAMP_STATUS_COLOR: Record<string, string> = {
  registered: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
}

function revenueOf(e: Enrollment) {
  if (!e.class) return 0
  return e.class.billing_type === 'flat'
    ? e.class.flat_amount ?? 0
    : e.class.monthly_tuition ?? 0
}

export default function EnrollmentsTable({
  enrollments, seasons, classes, students, campRegistrations,
}: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('enrolled')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [error, setError] = useState('')
  const [showGroup, setShowGroup] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [dropTarget, setDropTarget] = useState<Enrollment | null>(null)

  // Stats over the full (non-archived) set
  const live = enrollments.filter(e => !e.archived)
  const stats = {
    active: live.filter(e => e.status === 'active').length,
    waitlisted: live.filter(e => e.status === 'waitlisted').length,
    dropped: live.filter(e => e.status === 'dropped').length,
    completed: live.filter(e => e.status === 'completed').length,
    archived: enrollments.filter(e => e.archived).length,
  }
  const monthlyRevenue = live
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + revenueOf(e), 0)

  const activeCountByClass: Record<string, number> = {}
  for (const e of enrollments) {
    if (e.status === 'active' && e.class) {
      activeCountByClass[e.class.id] = (activeCountByClass[e.class.id] ?? 0) + 1
    }
  }

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const q = search.trim().toLowerCase()
  const base = enrollments.filter(e => {
    if (!showArchived && e.archived) return false
    if (seasonFilter !== 'all' && e.season_id !== seasonFilter) return false
    if (q) {
      const name = e.student ? `${e.student.first_name} ${e.student.last_name}`.toLowerCase() : ''
      const cls = e.class?.name.toLowerCase() ?? ''
      if (!name.includes(q) && !cls.includes(q)) return false
    }
    return true
  })

  const allView = base
    .filter(e => statusFilter === 'all' || e.status === statusFilter)
    .sort((a, b) => {
      let av = '', bv = ''
      if (sortKey === 'student') {
        av = a.student ? `${a.student.last_name} ${a.student.first_name}` : ''
        bv = b.student ? `${b.student.last_name} ${b.student.first_name}` : ''
      } else if (sortKey === 'class') {
        av = a.class?.name ?? ''
        bv = b.class?.name ?? ''
      } else if (sortKey === 'season') {
        av = a.season?.name ?? ''
        bv = b.season?.name ?? ''
      } else if (sortKey === 'enrolled') {
        av = a.enrolled_at
        bv = b.enrolled_at
      } else if (sortKey === 'status') {
        av = a.status
        bv = b.status
      }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })

  // Waitlist view: grouped by class, ordered by position
  const waitlisted = base.filter(e => e.status === 'waitlisted')
  const waitlistGroups = Object.values(
    waitlisted.reduce<Record<string, Enrollment[]>>((acc, e) => {
      const key = e.class?.id ?? 'none'
      ;(acc[key] ??= []).push(e)
      return acc
    }, {}),
  ).map(group =>
    group.sort(
      (a, b) =>
        (a.waitlist_position ?? Infinity) - (b.waitlist_position ?? Infinity) ||
        a.enrolled_at.localeCompare(b.enrolled_at),
    ),
  )

  const campView = campRegistrations.filter(r => {
    if (!q) return true
    const name = r.student ? `${r.student.first_name} ${r.student.last_name}`.toLowerCase() : ''
    const camp = r.camp?.name.toLowerCase() ?? ''
    return name.includes(q) || camp.includes(q)
  })

  const visible = mode === 'all' ? allView : mode === 'waitlist' ? waitlisted : []
  const selectedRows = visible.filter(e => selected.has(e.id))
  const allSelectedArchived = selectedRows.length > 0 && selectedRows.every(e => e.archived)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set())
    else setSelected(new Set(visible.map(e => e.id)))
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Update failed')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function onStatusChange(e: Enrollment, next: string) {
    if (next === e.status) return
    if (next === 'dropped') {
      setDropTarget(e)
      return
    }
    patch(e.id, { status: next })
  }

  async function del(e: Enrollment) {
    const name = e.student ? `${e.student.first_name} ${e.student.last_name}` : 'this student'
    if (!confirm(`Permanently delete the enrollment record for ${name}? This cannot be undone.`)) return
    setBusyId(e.id)
    setError('')
    try {
      const res = await fetch(`/api/enrollments/${e.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Delete failed')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function moveWaitlist(group: Enrollment[], index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= group.length) return
    const a = group[index]
    const b = group[target]
    setBusyId(a.id)
    setError('')
    try {
      await Promise.all([
        fetch(`/api/enrollments/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waitlist_position: target + 1 }),
        }),
        fetch(`/api/enrollments/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waitlist_position: index + 1 }),
        }),
      ])
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    const ids = [...selected]
    if (ids.length === 0) return
    if (action === 'delete' &&
        !confirm(`Permanently delete ${ids.length} enrollment record(s)? This cannot be undone.`)) {
      return
    }
    setBulkBusy(true)
    setError('')
    try {
      const res = await fetch('/api/enrollments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, ...extra }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Bulk action failed')
      }
      setSelected(new Set())
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkBusy(false)
    }
  }

  async function campPatch(campId: string, regId: string, body: Record<string, unknown>) {
    setBusyId(regId)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/registrations/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Update failed')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const statCard = (label: string, value: string | number, tone: string) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <div className={cn('text-2xl font-semibold', tone)}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCard('Active', stats.active, 'text-green-600')}
        {statCard('Waitlisted', stats.waitlisted, 'text-yellow-600')}
        {statCard('Dropped', stats.dropped, 'text-red-500')}
        {statCard('Completed', stats.completed, 'text-blue-600')}
        {statCard('Monthly Revenue', formatCurrency(monthlyRevenue), 'text-gray-900')}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => { setMode('all'); setSelected(new Set()) }}
              className={cn(
                'px-3 py-2 text-sm font-medium',
                mode === 'all' ? 'bg-studio-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              All
            </button>
            <button
              onClick={() => { setMode('waitlist'); setSelected(new Set()) }}
              className={cn(
                'px-3 py-2 text-sm font-medium border-l border-gray-200',
                mode === 'waitlist' ? 'bg-studio-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              Waitlist ({stats.waitlisted})
            </button>
            <button
              onClick={() => { setMode('camps'); setSelected(new Set()) }}
              className={cn(
                'px-3 py-2 text-sm font-medium border-l border-gray-200 flex items-center gap-1.5',
                mode === 'camps' ? 'bg-studio-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Tent size={14} /> Camps ({campRegistrations.length})
            </button>
          </div>

          {mode === 'all' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          )}

          {mode !== 'camps' && (
            <select
              value={seasonFilter}
              onChange={e => setSeasonFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
            >
              <option value="all">All Seasons</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={mode === 'camps' ? 'Search student or camp…' : 'Search student or class…'}
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500 w-56"
            />
          </div>

          {mode !== 'camps' && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => { setShowArchived(e.target.checked); setSelected(new Set()) }}
                className="rounded text-studio-600"
              />
              Show archived ({stats.archived})
            </label>
          )}

          <div className="ml-auto">
            {mode === 'camps' ? (
              <Link
                href="/camps"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700"
              >
                <Tent size={15} /> Manage Camps
              </Link>
            ) : (
              <button
                onClick={() => setShowGroup(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700"
              >
                <Plus size={15} /> New Enrollment
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-b border-gray-100 bg-studio-50 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-studio-700">{selected.size} selected</span>
            <div className="flex-1" />
            <select
              defaultValue=""
              disabled={bulkBusy}
              onChange={e => {
                if (e.target.value) {
                  bulk('status', { status: e.target.value })
                  e.target.value = ''
                }
              }}
              className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-studio-500 disabled:opacity-50"
            >
              <option value="">Set status…</option>
              {SETTABLE_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => setShowTransfer(true)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowRightLeft size={14} /> Transfer
            </button>
            <button
              onClick={() => setShowEmail(true)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Mail size={14} /> Email
            </button>
            <button
              onClick={() => bulk(allSelectedArchived ? 'restore' : 'archive')}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {allSelectedArchived
                ? <><ArchiveRestore size={14} /> Restore</>
                : <><Archive size={14} /> Archive</>}
            </button>
            <button
              onClick={() => bulk('delete')}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* WAITLIST MODE */}
        {mode === 'waitlist' ? (
          waitlistGroups.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No one is waitlisted</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {waitlistGroups.map(group => (
                <div key={group[0].class?.id ?? 'none'} className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {group[0].class?.name ?? 'Unknown class'}
                    <span className="text-gray-400 font-normal"> · {group.length} waiting</span>
                  </h3>
                  <div className="space-y-1.5">
                    {group.map((e, i) => {
                      const name = e.student
                        ? `${e.student.first_name} ${e.student.last_name}`
                        : '—'
                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(e.id)}
                            onChange={() => toggleSelect(e.id)}
                            className="rounded text-studio-600"
                          />
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 flex-1">{name}</span>
                          <span className="text-xs text-gray-400">{formatDate(e.enrolled_at)}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveWaitlist(group, i, -1)}
                              disabled={busyId === e.id || i === 0}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              onClick={() => moveWaitlist(group, i, 1)}
                              disabled={busyId === e.id || i === group.length - 1}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ChevronDown size={15} />
                            </button>
                          </div>
                          <button
                            onClick={() => patch(e.id, { status: 'active' })}
                            disabled={busyId === e.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            <ArrowUpCircle size={13} /> Promote
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : mode === 'camps' ? (
          /* CAMPS MODE */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Camp</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campView.map(r => {
                  const name = r.student
                    ? `${r.student.first_name} ${r.student.last_name}`
                    : '—'
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-5 py-3 text-sm">
                        {r.camp ? (
                          <Link href={`/camps/${r.camp.id}`} className="text-studio-700 hover:underline">
                            {r.camp.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatDate(r.registered_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-medium px-2 py-1 rounded-full',
                            CAMP_STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600',
                          )}>
                            {r.status}
                          </span>
                          <select
                            value={r.status}
                            disabled={busyId === r.id || !r.camp}
                            onChange={e => r.camp && campPatch(r.camp.id, r.id, { status: e.target.value })}
                            className="text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-600 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                          >
                            {CAMP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={r.payment_status}
                          disabled={busyId === r.id || !r.camp}
                          onChange={e => r.camp && campPatch(r.camp.id, r.id, { payment_status: e.target.value })}
                          className="text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-600 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                        >
                          {CAMP_PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {campView.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No camp registrations found</div>
            )}
          </div>
        ) : (
          /* ALL MODE */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === visible.length && visible.length > 0}
                      onChange={toggleAll}
                      className="rounded text-studio-600"
                    />
                  </th>
                  {(
                    [
                      ['student', 'Student'],
                      ['class', 'Class'],
                      ['season', 'Season'],
                      ['enrolled', 'Enrolled'],
                      ['status', 'Status'],
                    ] as [SortKey, string][]
                  ).map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
                    >
                      {label}
                      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allView.map(e => {
                  const name = e.student
                    ? `${e.student.first_name} ${e.student.last_name}`
                    : '—'
                  return (
                    <tr key={e.id} className={cn('hover:bg-gray-50', e.archived && 'bg-gray-50/60')}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggleSelect(e.id)}
                          className="rounded text-studio-600"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                          {name}
                          {e.archived && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase tracking-wide">
                              Archived
                            </span>
                          )}
                        </div>
                        {e.notes && (
                          <div className="text-xs text-gray-400 truncate max-w-[16rem]">{e.notes}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{e.class?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{e.season?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatDate(e.enrolled_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-1 rounded-full',
                              getEnrollmentStatusColor(e.status),
                            )}
                          >
                            {e.status}
                            {e.status === 'waitlisted' && e.waitlist_position
                              ? ` #${e.waitlist_position}`
                              : ''}
                          </span>
                          <select
                            value={e.status}
                            disabled={busyId === e.id}
                            onChange={ev => onStatusChange(e, ev.target.value)}
                            className="text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-600 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                          >
                            {SETTABLE_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => patch(e.id, { archived: !e.archived })}
                            disabled={busyId === e.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            aria-label={e.archived ? 'Restore enrollment' : 'Archive enrollment'}
                          >
                            {e.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                          </button>
                          <button
                            onClick={() => del(e)}
                            disabled={busyId === e.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            aria-label="Delete enrollment"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {allView.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No enrollments found</div>
            )}
          </div>
        )}
      </div>

      {showGroup && (
        <GroupEnrollModal
          onClose={() => setShowGroup(false)}
          students={students}
          classes={classes}
          activeCountByClass={activeCountByClass}
        />
      )}
      {showEmail && (
        <EnrollmentEmailModal
          onClose={() => setShowEmail(false)}
          enrollmentIds={[...selected]}
        />
      )}
      {showTransfer && (
        <BulkTransferModal
          onClose={() => setShowTransfer(false)}
          enrollmentIds={[...selected]}
          classes={classes}
        />
      )}
      {dropTarget && (
        <DropEnrollmentModal
          onClose={() => setDropTarget(null)}
          enrollmentId={dropTarget.id}
          studentName={
            dropTarget.student
              ? `${dropTarget.student.first_name} ${dropTarget.student.last_name}`
              : 'this student'
          }
          className={dropTarget.class?.name ?? 'this class'}
        />
      )}
    </div>
  )
}
