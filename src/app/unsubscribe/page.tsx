'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<Shell><p style={{ fontSize: 14, color: '#666' }}>Loading…</p></Shell>}>
      <UnsubscribeInner />
    </Suspense>
  )
}

function UnsubscribeInner() {
  const params = useSearchParams()
  const status = params.get('status') ?? 'done'
  const email = params.get('e') ?? ''
  const token = params.get('t') ?? ''
  const [resubscribed, setResubscribed] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  if (status === 'error') {
    return (
      <Shell>
        <h1 style={h1}>Something went wrong</h1>
        <p style={p}>
          We couldn’t process your request just now. Please try the link again in a moment, or
          reply to any of our emails and we’ll remove you right away.
        </p>
      </Shell>
    )
  }

  if (status === 'invalid') {
    return (
      <Shell>
        <h1 style={h1}>Link expired</h1>
        <p style={p}>
          This unsubscribe link is invalid or has expired. If you’d like to stop receiving
          emails, just reply to any message from us and we’ll take care of it.
        </p>
      </Shell>
    )
  }

  if (resubscribed) {
    return (
      <Shell>
        <h1 style={h1}>You’re re-subscribed 🎉</h1>
        <p style={p}>
          Welcome back! <strong>{email}</strong> will continue to receive studio news and updates.
        </p>
      </Shell>
    )
  }

  async function resubscribe() {
    setWorking(true)
    setError('')
    try {
      const res = await fetch(
        `/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}&action=resubscribe`,
        { method: 'POST' },
      )
      if (!res.ok) {
        setError('Something went wrong. Please reply to one of our emails and we’ll help.')
      } else {
        setResubscribed(true)
      }
    } catch {
      setError('Something went wrong. Please reply to one of our emails and we’ll help.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Shell>
      <h1 style={h1}>You’ve been unsubscribed</h1>
      <p style={p}>
        {email ? <strong>{email}</strong> : 'Your email'} has been removed from our mailing list and
        won’t receive any more studio newsletters or announcements.
      </p>
      <p style={{ ...p, color: '#666', fontSize: 14 }}>
        Unsubscribed by mistake?
      </p>
      {token && email && (
        <button onClick={resubscribe} disabled={working} style={button}>
          {working ? 'Working…' : 'Re-subscribe'}
        </button>
      )}
      {error && <p style={{ ...p, color: '#b91c1c', fontSize: 14 }}>{error}</p>}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Logo />
        </div>
        {children}
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#faf7f2',
  padding: 24,
}
const card: React.CSSProperties = {
  maxWidth: 460,
  width: '100%',
  background: '#fff',
  borderRadius: 16,
  padding: '32px 28px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}
const h1: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#1e1b4b', margin: '0 0 12px' }
const p: React.CSSProperties = { fontSize: 15, color: '#374151', lineHeight: 1.6, margin: '0 0 12px' }
const button: React.CSSProperties = {
  display: 'inline-block',
  background: '#6d28d9',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  fontSize: 15,
  padding: '11px 26px',
  borderRadius: 999,
  cursor: 'pointer',
  marginTop: 4,
}
