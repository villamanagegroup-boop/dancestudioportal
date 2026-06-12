'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export interface PendingItem {
  id: string
  kind: 'class' | 'camp'
  title: string
  subtitle: string
}

export default function PortalPendingList({ items }: { items: PendingItem[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function cancel(it: PendingItem) {
    if (!confirm(`Cancel your pending request for ${it.title}?`)) return
    setBusy(it.id); setError('')
    try {
      const res = await fetch('/api/portal/cancel-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: it.kind, id: it.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error ?? 'Could not cancel')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>No pending requests.</p>
  }

  return (
    <div className="tight-list">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {items.map(it => (
        <div key={`${it.kind}-${it.id}`} className="tl-row">
          <div className="tl-main">
            <div className="t">{it.title}</div>
            <div className="s">{it.subtitle}</div>
          </div>
          <div className="tl-trail" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="tag tag-amber">pending</span>
            <button
              onClick={() => cancel(it)}
              disabled={busy === it.id}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label="Cancel request"
              title="Cancel request"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
