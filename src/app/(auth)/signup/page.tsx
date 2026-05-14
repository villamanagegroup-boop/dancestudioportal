'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.first_name, last_name: form.last_name, role: 'parent' },
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    router.push('/portal')
  }

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid var(--line-2)',
    color: 'var(--ink-1)',
  }

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-6" style={{ color: 'var(--ink-1)' }}>Create Account</h2>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={fieldStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            className="w-full px-3 py-2 rounded-xl focus:outline-none"
            style={fieldStyle}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-xl focus:outline-none"
            style={fieldStyle}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        Already have an account?{' '}
        <Link href="/login" className="link">Sign in</Link>
      </p>
    </div>
  )
}
