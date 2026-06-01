'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import SlideOver from '@/components/SlideOver'
import { formLabel, detailRows, timeAgo } from '@/lib/intake'
import type { IntakeRow } from '@/components/admin/IntakeInbox'

export default function IntakeDetail({
  row, onClose, onDismiss, dismissing,
}: {
  row: IntakeRow
  onClose: () => void
  onDismiss: (notes: string) => void
  dismissing: boolean
}) {
  const [notes, setNotes] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const rows = detailRows(row.payload)
  const isDismissed = row.status === 'dismissed'

  return (
    <SlideOver title={`${formLabel(row.source_form)} submission`} onClose={onClose} width={540}>
      <div className="p-6 space-y-6">
        {/* Submitter + meta */}
        <div>
          <div className="text-lg font-semibold text-gray-900">{row.submitter_name || 'Unknown sender'}</div>
          {row.submitter_email && (
            <a href={`mailto:${row.submitter_email}`} className="text-sm text-studio-600 hover:underline">
              {row.submitter_email}
            </a>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {formLabel(row.source_form)}
            </span>
            <span>·</span>
            <span title={new Date(row.created_at).toLocaleString()}>Received {timeAgo(row.created_at)}</span>
            <span>·</span>
            <span className="capitalize">{row.status}</span>
          </div>
        </div>

        {/* Labeled payload fields */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Submission details</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400">No additional fields.</p>
          ) : (
            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {rows.map(({ label, value }) => (
                <div key={label} className="grid grid-cols-3 gap-3 px-4 py-2.5">
                  <dt className="text-xs font-medium text-gray-500 col-span-1">{label}</dt>
                  <dd className="text-sm text-gray-800 col-span-2 whitespace-pre-wrap break-words">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Raw JSON (collapsible) */}
        <div>
          <button
            onClick={() => setShowRaw(s => !s)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            {showRaw ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            View raw payload
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 rounded-xl bg-gray-900 text-gray-100 text-xs overflow-x-auto">
              {JSON.stringify(row.payload ?? {}, null, 2)}
            </pre>
          )}
        </div>

        {/* Dismiss action / processed state */}
        {isDismissed ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Dismissed</p>
            {row.processed_at && (
              <p className="text-sm text-gray-600">{timeAgo(row.processed_at)}</p>
            )}
            {row.admin_notes && (
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{row.admin_notes}</p>
            )}
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-5">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Note (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Why is this being dismissed? Saved to the record."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
            />
            <button
              onClick={() => onDismiss(notes)}
              disabled={dismissing}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <X size={16} />
              {dismissing ? 'Dismissing…' : 'Dismiss submission'}
            </button>
          </div>
        )}
      </div>
    </SlideOver>
  )
}
