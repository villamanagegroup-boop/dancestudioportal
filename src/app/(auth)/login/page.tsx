'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'admin' || profile?.role === 'instructor') {
      router.push('/dashboard')
    } else {
      router.push('/portal')
    }
  }

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-6" style={{ color: 'var(--ink-1)' }}>Sign In</h2>
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
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="btn btn-ghost w-full justify-center"
        >
          Continue as Admin (dev bypass)
        </button>
      </div>
      <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="link">Sign up</Link>
      </p>
    </div>
  )
}
