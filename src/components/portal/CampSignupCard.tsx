'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

interface Camp {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  price: number
  age_min: number | null
  age_max: number | null
  spotsLeft: number | null
}

interface Props {
  camp: Camp
  students: StudentOption[]
}

export default function CampSignupCard({ camp, students }: Props) {
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const full = camp.spotsLeft != null && camp.spotsLeft <= 0

  async function register() {
    if (!studentId) {
      setError('Pick a dancer first.')
      return
    }
    setSubmitting(true)
    setError('')
    setDone('')
    try {
      const res = await fetch('/api/portal/camp-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camp_id: camp.id, student_id: studentId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not register')
      setDone(json.waitlisted ? 'Added to the waitlist' : 'Registered!')
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
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900">{camp.name}</h3>
        {full && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
            Waitlist
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {formatDate(camp.start_date)} – {formatDate(camp.end_date)}
      </p>
      {(camp.age_min || camp.age_max) && (
        <p className="text-xs text-gray-400 mt-0.5">
          Ages {camp.age_min ?? '?'}–{camp.age_max ?? '?'}
        </p>
      )}
      {camp.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-3">{camp.description}</p>
      )}
      <p className="text-sm font-semibold text-gray-900 mt-2">{formatCurrency(Number(camp.price))}</p>
      {camp.spotsLeft != null && camp.spotsLeft > 0 && (
        <p className="text-xs text-gray-400">{camp.spotsLeft} spot{camp.spotsLeft === 1 ? '' : 's'} left</p>
      )}

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
          onClick={register}
          disabled={submitting || students.length === 0}
          className="px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          {submitting ? '…' : full ? 'Join Waitlist' : 'Register'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {done && <p className="text-xs text-green-600 mt-2">{done}</p>}
    </div>
  )
}
