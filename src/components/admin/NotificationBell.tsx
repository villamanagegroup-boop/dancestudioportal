'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setItems(json.items ?? [])
      setUnread(json.unread ?? 0)
    } catch {
      // best-effort — the bell stays at its last known state
    }
  }, [])

  // Initial load + lightweight polling so new events surface without a refresh.
  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markRead(id: string) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnread(u => Math.max(0, u - 1))
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {}
  }

  async function markAll() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch {}
  }

  function openItem(n: NotificationItem) {
    if (!n.read) markRead(n.id)
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="icon-btn"
        title="Notifications"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: 5, right: 6,
              minWidth: 15, height: 15, padding: '0 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff',
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--grad-3), var(--grad-1))',
              boxShadow: '0 0 0 2px var(--glass-thin)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 z-50 overflow-hidden"
          style={{
            borderRadius: 14,
            background: 'var(--glass-strong, rgba(255,255,255,0.95))',
            border: '1px solid var(--line)',
            boxShadow: '0 12px 40px -8px rgba(20,24,80,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: 'var(--ink-3)' }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-4)' }}>
                You&apos;re all caught up.
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className="w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-white/60"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <span
                    className="mt-1.5 flex-shrink-0 rounded-full"
                    style={{
                      width: 7, height: 7,
                      background: n.read ? 'transparent' : 'linear-gradient(135deg, var(--grad-3), var(--grad-1))',
                      boxShadow: n.read ? 'inset 0 0 0 1px var(--line)' : 'none',
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate" style={{ color: 'var(--ink-1)', fontWeight: n.read ? 500 : 600 }}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="block text-xs truncate" style={{ color: 'var(--ink-3)' }}>{n.body}</span>
                    )}
                    <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ink-4)' }}>{relTime(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
