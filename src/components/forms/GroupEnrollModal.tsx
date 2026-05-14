'use client'

import { useState } from 'react'
import { X, Search, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface ClassOption {
  id: string
  name: string
  max_students: number
  monthly_tuition: number
  billing_type: string
  flat_amount: number | null
  season_id: string | null
}

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  onClose: () => void
  students: StudentOption[]
  classes: ClassOption[]
  activeCountByClass: Record<string, number>
}

const field =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function GroupEnrollModal({ onClose, students, classes, activeCountByClass }: Props) {
  const router = useRouter()
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set())
  const [classIds, setClassIds] = useState<Set<string>>(new Set())
  const [studentQ, setStudentQ] = useState('')
  const [classQ, setClassQ] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const sq = studentQ.trim().toLowerCase()
  const cq = classQ.trim().toLowerCase()
  const visStudents = students.filter(s =>
    !sq || `${s.first_name} ${s.last_name}`.toLowerCase().includes(sq),
  )
  const visClasses = classes.filter(c => !cq || c.name.toLowerCase().includes(cq))

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const pairCount = studentIds.size * classIds.size

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (studentIds.size === 0 || classIds.size === 0) {
      setError('Pick at least one student and one class.')
      return
    }
    setSubmitting(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/enrollments/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [...studentIds],
          classIds: [...classIds],
          notes: notes || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to enroll')
      const parts = [`${json.created} enrolled`]
      if (json.waitlisted) parts.push(`${json.waitlisted} waitlisted`)
      if (json.skipped) parts.push(`${json.skipped} skipped (already enrolled)`)
      setResult(parts.join(' · '))
      setStudentIds(new Set())
      setClassIds(new Set())
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} /> Group Enrollment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {result && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              {result}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Students */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Students ({studentIds.size})
                </label>
                {studentIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentIds(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative mb-1.5">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={studentQ}
                  onChange={e => setStudentQ(e.target.value)}
                  placeholder="Search students…"
                  className={field + ' pl-7 py-1.5'}
                />
              </div>
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                {visStudents.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">No students</div>
                )}
                {visStudents.map(s => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={studentIds.has(s.id)}
                      onChange={() => toggle(studentIds, s.id, setStudentIds)}
                      className="rounded text-studio-600"
                    />
                    <span>{s.last_name}, {s.first_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Classes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Classes ({classIds.size})
                </label>
                {classIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setClassIds(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative mb-1.5">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={classQ}
                  onChange={e => setClassQ(e.target.value)}
                  placeholder="Search classes…"
                  className={field + ' pl-7 py-1.5'}
                />
              </div>
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                {visClasses.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">No classes</div>
                )}
                {visClasses.map(c => {
                  const enrolled = activeCountByClass[c.id] ?? 0
                  const full = enrolled >= c.max_students
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={classIds.has(c.id)}
                        onChange={() => toggle(classIds, c.id, setClassIds)}
                        className="rounded text-studio-600"
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className={`text-xs ${full ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {enrolled}/{c.max_students}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={field + ' resize-none'}
              placeholder="Applied to every enrollment created (optional)"
            />
          </div>

          <p className="text-xs text-gray-400">
            Creates up to {pairCount} enrollment{pairCount === 1 ? '' : 's'} (student × class). Students
            already enrolled in a class are skipped; full classes add to the waitlist.
          </p>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || pairCount === 0}
              className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
            >
              {submitting ? 'Enrolling…' : `Enroll ${pairCount || ''}`.trim()}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
