'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Inbox, ChevronRight, X } from 'lucide-react'
import { showToast } from '@/lib/toast'
import {
  FORM_TYPES, formLabel, summarize, truncate, timeAgo,
} from '@/lib/intake'
import IntakeDetail from '@/components/admin/IntakeDetail'

export interface IntakeRow {
  id: string
  source_form: string
  source_table: string
  submitter_name: string | null
  submitter_email: string | null
  payload: Record<string, unknown> | null
  status: string
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active (hide dismissed)' },
  { value: 'new', label: 'New' },
  { value: 'matched', label: 'Matched' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'all', label: 'All statuses' },
]

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-studio-50 text-studio-700',
  matched: 'bg-emerald-50 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-500',
  duplicate: 'bg-amber-50 text-amber-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

export default function IntakeInbox({
  rows, source, status, newCount,
}: {
  rows: IntakeRow[]
  source: string
  status: string
  newCount: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [openRow, setOpenRow] = useState<IntakeRow | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  function setFilter(key: 'source' | 'status', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    // 'all' source and 'active' status are the defaults — drop them to keep
    // the URL clean.
    const isDefault = (key === 'source' && value === 'all') || (key === 'status' && value === 'active')
    if (isDefault) params.delete(key)
    else params.set(key, value)
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  async function dismiss(id: string, admin_notes?: string) {
    setDismissingId(id)
    try {
      const res = await fetch(`/api/intake/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', admin_notes: admin_notes ?? null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to dismiss')
      showToast('Submission dismissed')
      setOpenRow(null)
      startTransition(() => router.refresh())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to dismiss', 'error')
    } finally {
      setDismissingId(null)
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Form</span>
          <select
            value={source}
            onChange={e => setFilter('source', e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
          >
            <option value="all">All forms</option>
            {FORM_TYPES.map(f => (
              <option key={f.slug} value={f.slug}>{f.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Status</span>
          <select
            value={status}
            onChange={e => setFilter('status', e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-studio-50 text-studio-700">
          <span className="w-1.5 h-1.5 rounded-full bg-studio-500" />
          {newCount} new
        </span>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No submissions match these filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Received</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Form</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">From</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const snippet = truncate(summarize(row.source_form, row.payload))
                return (
                  <tr
                    key={row.id}
                    onClick={() => setOpenRow(row)}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap" title={new Date(row.created_at).toLocaleString()}>
                      {timeAgo(row.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {formLabel(row.source_form)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-gray-900">{row.submitter_name || '—'}</div>
                      <div className="text-xs text-gray-500">{row.submitter_email || ''}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-xs">
                      <span className="line-clamp-1">{snippet || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        {row.status !== 'dismissed' && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (window.confirm('Dismiss this submission? You can add a note from the detail view instead.')) {
                                dismiss(row.id)
                              }
                            }}
                            disabled={dismissingId === row.id}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <X size={13} />
                            Dismiss
                          </button>
                        )}
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(isPending) && (
        <div className="px-5 py-2 text-xs text-gray-400">Updating…</div>
      )}

      {openRow && (
        <IntakeDetail
          row={openRow}
          onClose={() => setOpenRow(null)}
          onDismiss={notes => dismiss(openRow.id, notes)}
          dismissing={dismissingId === openRow.id}
        />
      )}
    </>
  )
}
