'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2 } from 'lucide-react'
import { formatDate, getAgeFromDob, getEnrollmentStatusColor, cn } from '@/lib/utils'
import type { Enrollment } from '@/components/admin/ClassDetail'

interface StudentOption { id: string; first_name: string; last_name: string; date_of_birth: string }

interface Props {
  classId: string
  enrollments: Enrollment[]
  students: StudentOption[]
}

export default function ClassRosterTab({ classId, enrollments, students }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const enrolledIds = new Set(
    enrollments
      .filter(e => e.status !== 'dropped' && e.status !== 'completed')
      .map(e => e.student?.id)
      .filter(Boolean) as string[],
  )
  const available = students.filter(s => !enrolledIds.has(s.id))

  async function addEnrollee() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classes/${classId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selected }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to add student')
      }
      setSelected('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(enrollmentId: string, name: string) {
    if (!confirm(`Remove ${name} from this class?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classes/${classId}/enrollments/${enrollmentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to remove student')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900 mr-auto">Roster ({enrollments.length})</h2>
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
          onClick={addEnrollee}
          disabled={busy || !selected}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          <UserPlus size={15} /> Add
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {enrollments.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No students enrolled yet</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Enrolled</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {enrollments.map(e => {
              const name = e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{name}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {e.student ? `${getAgeFromDob(e.student.date_of_birth)} yrs` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(e.enrolled_at)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => remove(e.id, name)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Remove from class"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
