'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('This reset link is invalid or has expired. Request a new one.')
      }
      setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-6" style={{ color: 'var(--ink-1)' }}>Set new password</h2>
      {!ready ? (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Verifying link…</p>
      ) : success ? (
        <p className="text-sm" style={{ color: '#059669' }}>Password updated. Redirecting to sign in…</p>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
            <Link href="/login" className="link">Back to sign in</Link>
          </p>
        </>
      )}
    </div>
  )
}
