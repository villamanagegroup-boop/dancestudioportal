'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Shell><p style={{ fontSize: 14, color: '#666' }}>Loading…</p></Shell>}>
      <AcceptInviteInner />
    </Suspense>
  )
}

type InviteData = { email: string; first_name: string; last_name: string }

function AcceptInviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoadError('No invite token in URL.')
      return
    }
    fetch(`/api/instructor-invites/accept?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) setLoadError(data.error ?? 'Invalid invite')
        else setInvite(data)
      })
      .catch(() => setLoadError('Failed to load invite.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setSubmitError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch('/api/instructor-invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSubmitError(data.error ?? 'Failed to create account')
      setSubmitting(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/login'), 1500)
  }

  if (loadError) {
    return (
      <Shell>
        <h2 className="h2 mb-3" style={{ color: 'var(--ink-1)' }}>Invitation problem</h2>
        <p className="mb-4 text-sm" style={{ color: '#b91c1c' }}>{loadError}</p>
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          Ask the studio to send a new invite.{' '}
          <Link href="/login" className="link">Sign in</Link> instead if you already have an account.
        </p>
      </Shell>
    )
  }

  if (!invite) {
    return <Shell><p style={{ fontSize: 14, color: '#666' }}>Loading invitation…</p></Shell>
  }

  if (done) {
    return (
      <Shell>
        <h2 className="h2 mb-3" style={{ color: 'var(--ink-1)' }}>Welcome aboard!</h2>
        <p className="text-sm" style={{ color: '#059669' }}>Account created. Redirecting to sign in…</p>
      </Shell>
    )
  }

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid var(--line-2)',
    color: 'var(--ink-1)',
  }

  return (
    <Shell>
      <h2 className="h2 mb-2" style={{ color: 'var(--ink-1)' }}>Accept invitation</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
        Welcome, <strong>{invite.first_name}</strong>. Set a password to activate your instructor account
        for <strong>{invite.email}</strong>.
      </p>
      {submitError && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}>{submitError}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Password</label>
          <input type="password" required minLength={6} value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Confirm password</label>
          <input type="password" required minLength={6} value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
            className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="brand-mark mx-auto" style={{ width: 64, height: 64, borderRadius: 18 }}>
            <span className="text-white text-2xl font-bold">CC</span>
          </div>
          <h1 className="h1 mt-4 grad-text">Capital Core Dance Studio</h1>
        </div>
        <div className="glass-strong p-8">{children}</div>
      </div>
    </div>
  )
}
