'use client'

import { useEffect, useState } from 'react'
import { X, ChevronDown, ChevronRight, Users } from 'lucide-react'
import SlideOver from '@/components/SlideOver'
import { formLabel, detailRows, timeAgo } from '@/lib/intake'
import type { IntakeRow } from '@/components/admin/IntakeInbox'

interface Candidate {
  id: string
  name: string
  email: string | null
  child_count: number
  students: { id: string; name: string }[]
}

export default function IntakeDetail({
  row, onClose, onDismiss, dismissing, onMatch, matching,
}: {
  row: IntakeRow
  onClose: () => void
  onDismiss: (notes: string) => void
  dismissing: boolean
  onMatch: (profileId: string, studentIds: string[], label: string) => void
  matching: boolean
}) {
  const [notes, setNotes] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const rows = detailRows(row.payload)
  const isDismissed = row.status === 'dismissed'

  // Matched-family display (from the embedded profile on the row).
  const linked = row.linked_profile
  const matchedName = linked ? `${linked.first_name ?? ''} ${linked.last_name ?? ''}`.trim() : ''
  const matchedStudents = (linked?.guardian_students ?? [])
    .map(g => g.student)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map(s => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unnamed')
  const isMatched = row.status === 'matched' && !!linked

  // Match search.
  const [showSearch, setShowSearch] = useState(!isMatched)
  const [query, setQuery] = useState(row.submitter_email ?? '')
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function runSearch(q?: string) {
    setSearching(true)
    try {
      const trimmed = (q ?? '').trim()
      const url = `/api/intake/${row.id}/candidates${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      setCandidates(Array.isArray(json.candidates) ? json.candidates : [])
    } catch {
      setCandidates([])
    } finally {
      setSearching(false)
    }
  }

  // Auto-search on open (using the row's own email/name) for non-dismissed rows.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isDismissed) runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

        {isDismissed ? (
          /* Dismissed state */
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Dismissed</p>
            {row.processed_at && <p className="text-sm text-gray-600">{timeAgo(row.processed_at)}</p>}
            {row.admin_notes && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{row.admin_notes}</p>}
          </div>
        ) : (
          <>
            {/* Match to existing family */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Match to existing family
              </h3>

              {isMatched && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-900">{matchedName || 'Linked family'}</p>
                  </div>
                  {linked?.email && <p className="text-xs text-emerald-700 mt-0.5">{linked.email}</p>}
                  {matchedStudents.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-700">Students: {matchedStudents.join(', ')}</p>
                  )}
                  {!showSearch && (
                    <button
                      onClick={() => { setShowSearch(true); if (!candidates) runSearch() }}
                      className="mt-2 text-xs font-medium text-emerald-700 underline"
                    >
                      Change match
                    </button>
                  )}
                </div>
              )}

              {showSearch && (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') runSearch(query) }}
                      placeholder="Search by email or name"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
                    />
                    <button
                      onClick={() => runSearch(query)}
                      disabled={searching}
                      className="px-3 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>

                  {searching ? (
                    <p className="text-sm text-gray-400">Searching…</p>
                  ) : candidates && candidates.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No matching families found. Creating a new family comes in a later phase.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {candidates?.map(c => {
                        const isCurrent = c.id === row.linked_profile_id
                        return (
                          <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900">{c.name}</div>
                              {c.email && <div className="text-xs text-gray-500 truncate">{c.email}</div>}
                              <div className="text-xs text-gray-500 mt-0.5">
                                {c.child_count} {c.child_count === 1 ? 'child' : 'children'}
                                {c.students.length > 0 && <>: {c.students.map(s => s.name).join(', ')}</>}
                              </div>
                            </div>
                            <button
                              onClick={() => onMatch(c.id, c.students.map(s => s.id), c.name)}
                              disabled={matching || isCurrent}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-studio-600 text-studio-700 hover:bg-studio-50 disabled:opacity-50"
                            >
                              {isCurrent ? 'Current' : matching ? 'Matching…' : 'Match'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Dismiss */}
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
          </>
        )}
      </div>
    </SlideOver>
  )
}
