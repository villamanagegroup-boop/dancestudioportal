'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/reset-password`
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-6" style={{ color: 'var(--ink-1)' }}>Reset password</h2>
      {sent ? (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
            If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            Check your inbox (and spam folder).
          </p>
          <Link href="/login" className="link text-sm">← Back to sign in</Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
            Remembered it?{' '}
            <Link href="/login" className="link">Sign in</Link>
          </p>
        </>
      )}
    </div>
  )
}
