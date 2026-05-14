'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTime } from '@/lib/utils'

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

interface ClassInfo {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  monthly_tuition: number
  color: string
  instructorName: string | null
  spotsLeft: number | null
}

interface Props {
  cls: ClassInfo
  students: StudentOption[]
}

export default function ClassEnrollCard({ cls, students }: Props) {
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const full = cls.spotsLeft != null && cls.spotsLeft <= 0

  async function enroll() {
    if (!studentId) {
      setError('Pick a dancer first.')
      return
    }
    setSubmitting(true)
    setError('')
    setDone('')
    try {
      const res = await fetch('/api/portal/class-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: cls.id, student_id: studentId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not enroll')
      setDone(json.waitlisted ? 'Added to the waitlist' : 'Enrolled!')
      setStudentId('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }} />
        <h3 className="font-semibold text-gray-900">{cls.name}</h3>
        {full && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ml-auto">
            Waitlist
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 capitalize">
        {cls.day_of_week} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
      </p>
      {cls.instructorName && <p className="text-sm text-gray-500">{cls.instructorName}</p>}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm font-semibold text-gray-900">${cls.monthly_tuition}/mo</p>
        {cls.spotsLeft != null && cls.spotsLeft > 0 && (
          <p className="text-xs text-gray-400">{cls.spotsLeft} spot{cls.spotsLeft === 1 ? '' : 's'} left</p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <select
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
        >
          <option value="">Choose dancer…</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
          ))}
        </select>
        <button
          onClick={enroll}
          disabled={submitting || students.length === 0}
          className="px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          {submitting ? '…' : full ? 'Join Waitlist' : 'Enroll'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {done && <p className="text-xs text-green-600 mt-2">{done}</p>}
    </div>
  )
}
