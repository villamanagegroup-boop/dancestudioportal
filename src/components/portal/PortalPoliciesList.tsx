'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Response {
  policy_id: string
  status: string
  policy_version: number
  denial_reason: string | null
  accepted_at: string
}
interface Policy {
  id: string
  name: string
  body: string | null
  required: boolean
  version: number
  category: string | null
  response: Response | null
}

export default function PortalPoliciesList({ items }: { items: Policy[] }) {
  const router = useRouter()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [denying, setDenying] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function respond(policyId: string, action: 'accept' | 'deny', why?: string) {
    setBusy(policyId)
    setError(null)
    try {
      const res = await fetch(`/api/portal/policies/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: why }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Something went wrong')
      }
      setDenying(null)
      setReason('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {items.map(p => {
        const r = p.response
        const accepted = r?.status === 'accepted' && r.policy_version === p.version
        const denied = r?.status === 'denied'
        const stale = r?.status === 'accepted' && r.policy_version !== p.version
        const isOpen = !!open[p.id]

        return (
          <div
            key={p.id}
            className={`rounded-xl border ${
              accepted ? 'border-green-200 bg-green-50/40'
                : denied ? 'border-red-200 bg-red-50/30'
                : p.required ? 'border-amber-200 bg-amber-50/30'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {accepted ? <CheckCircle2 size={18} className="text-green-600" />
                    : denied ? <XCircle size={18} className="text-red-500" />
                    : <AlertCircle size={18} className={p.required ? 'text-amber-500' : 'text-gray-400'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    {p.required
                      ? <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Required</span>
                      : <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {accepted ? <>Accepted {formatDate(r!.accepted_at)}</>
                      : denied ? <>Denied {formatDate(r!.accepted_at)}{r!.denial_reason ? <> · “{r!.denial_reason}”</> : null} · under review</>
                      : stale ? <>Updated since you last accepted — please review again</>
                      : <>Not yet responded</>}
                  </p>

                  <button
                    onClick={() => setOpen(o => ({ ...o, [p.id]: !o[p.id] }))}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-studio-600 hover:text-studio-700"
                  >
                    {isOpen ? 'Hide' : 'Read'} policy
                    <ChevronDown size={13} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>

                  {isOpen && p.body && (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-white border border-gray-150 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {p.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {denying === p.id ? (
                <div className="mt-3 pl-7">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    A reason is required so the studio can review your concern.
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    placeholder="Tell us why you can't accept this policy…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-studio-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => respond(p.id, 'deny', reason)}
                      disabled={busy === p.id || !reason.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {busy === p.id && <Loader2 size={13} className="animate-spin" />} Submit denial
                    </button>
                    <button onClick={() => { setDenying(null); setReason('') }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pl-7 flex items-center gap-2">
                  {!accepted && (
                    <button
                      onClick={() => respond(p.id, 'accept')}
                      disabled={busy === p.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50"
                    >
                      {busy === p.id && <Loader2 size={13} className="animate-spin" />}
                      {stale || denied ? 'Accept now' : 'I accept'}
                    </button>
                  )}
                  {!denied && (
                    <button
                      onClick={() => { setDenying(p.id); setReason(''); setError(null) }}
                      disabled={busy === p.id}
                      className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      {accepted ? 'Withdraw / deny' : 'Deny'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
