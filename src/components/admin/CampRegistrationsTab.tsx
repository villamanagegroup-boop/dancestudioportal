'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, getAgeFromDob } from '@/lib/utils'
import type { CampRegistration, StudentOption } from '@/components/admin/CampDetail'

interface Props {
  campId: string
  maxCapacity: number
  price: number
  registrations: CampRegistration[]
  students: StudentOption[]
}

const STATUSES = ['registered', 'waitlisted', 'cancelled', 'completed']
const PAYMENTS = ['unpaid', 'deposit', 'paid', 'refunded', 'waived']

const STATUS_COLOR: Record<string, string> = {
  registered: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
}

export default function CampRegistrationsTab({ campId, maxCapacity, price, registrations, students }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const registeredCount = registrations.filter(r => r.status === 'registered').length
  const waitlistedCount = registrations.filter(r => r.status === 'waitlisted').length
  const collected = registrations.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  const expected = registeredCount * price
  const fillPct = maxCapacity > 0 ? Math.min(100, Math.round((registeredCount / maxCapacity) * 100)) : 0

  const takenIds = new Set(
    registrations.filter(r => r.status !== 'cancelled').map(r => r.student?.id).filter(Boolean) as string[],
  )
  const available = students.filter(s => !takenIds.has(s.id))

  async function addStudent() {
    if (!selected) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selected }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to register student')
      }
      setSelected('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function patch(regId: string, body: Record<string, unknown>) {
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

  async function remove(regId: string, name: string) {
    if (!confirm(`Remove ${name} from this camp?`)) return
    setBusyId(regId)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/registrations/${regId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to remove')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Rollup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-gray-900">
            {registeredCount}<span className="text-base text-gray-400"> / {maxCapacity}</span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Registered</div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={fillPct >= 100 ? 'h-full bg-red-500' : 'h-full bg-studio-500'}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-yellow-600">{waitlistedCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Waitlisted</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-green-600">{formatCurrency(collected)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Collected</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-gray-900">{formatCurrency(Math.max(0, expected - collected))}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Outstanding</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900 mr-auto">Roster ({registrations.length})</h2>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500 min-w-56"
          >
            <option value="">Add a student…</option>
            {available.map(s => (
              <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
            ))}
          </select>
          <button
            onClick={addStudent}
            disabled={adding || !selected}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <UserPlus size={15} /> Add
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {registrations.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No students registered yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map(r => {
                  const name = r.student ? `${r.student.first_name} ${r.student.last_name}` : '—'
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {r.student ? `${getAgeFromDob(r.student.date_of_birth)} yrs` : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatDate(r.registered_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.status}
                            {r.status === 'waitlisted' && r.waitlist_position ? ` #${r.waitlist_position}` : ''}
                          </span>
                          <select
                            value={r.status}
                            disabled={busyId === r.id}
                            onChange={e => patch(r.id, { status: e.target.value })}
                            className="text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-600 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={r.payment_status}
                          disabled={busyId === r.id}
                          onChange={e => patch(r.id, { payment_status: e.target.value })}
                          className="text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-600 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                        >
                          {PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={Number(r.amount_paid || 0)}
                          disabled={busyId === r.id}
                          onBlur={e => {
                            const v = Number(e.target.value) || 0
                            if (v !== Number(r.amount_paid || 0)) patch(r.id, { amount_paid: v })
                          }}
                          className="w-20 text-xs rounded border border-gray-200 px-1.5 py-1 text-gray-700 focus:outline-none focus:border-studio-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => remove(r.id, name)}
                          disabled={busyId === r.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Remove from camp"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
