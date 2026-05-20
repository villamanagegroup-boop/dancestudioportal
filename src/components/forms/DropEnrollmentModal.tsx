'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SlideOver from '@/components/SlideOver'

interface Props {
  onClose: () => void
  enrollmentId: string
  studentName: string
  className: string
}

const field =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function DropEnrollmentModal({ onClose, enrollmentId, studentName, className }: Props) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function confirmDrop() {
    setSubmitting(true)
    setError('')
    try {
      const note = reason.trim()
        ? `Dropped ${new Date().toLocaleDateString()} — ${reason.trim()}`
        : `Dropped ${new Date().toLocaleDateString()}`
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dropped', notes: note }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to drop enrollment')
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <SlideOver title="Drop Enrollment" onClose={onClose}>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Drop <strong>{studentName}</strong> from <strong>{className}</strong>? This frees a seat and may
            auto-promote the next waitlisted student.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className={field + ' resize-none'}
              placeholder="e.g. Schedule conflict, moved away…"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDrop}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Dropping…' : 'Drop'}
            </button>
          </div>
        </div>
    </SlideOver>
  )
}
