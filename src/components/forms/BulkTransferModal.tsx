'use client'

import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ClassOption } from '@/components/forms/GroupEnrollModal'

interface Props {
  onClose: () => void
  enrollmentIds: string[]
  classes: ClassOption[]
}

const field =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function BulkTransferModal({ onClose, enrollmentIds, classes }: Props) {
  const router = useRouter()
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function transfer() {
    if (!classId) {
      setError('Pick a target class.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/enrollments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: enrollmentIds, action: 'transfer', classId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Transfer failed')
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft size={18} /> Transfer Enrollments
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Move {enrollmentIds.length} enrollment{enrollmentIds.length === 1 ? '' : 's'} to a different
            class. Status and history are kept.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target class *</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} className={field}>
              <option value="">Select a class…</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={transfer}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
            >
              {submitting ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
