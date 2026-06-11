'use client'

import { useState } from 'react'
import Link from 'next/link'

const inputStyle = { background: 'rgba(255,255,255,0.65)', border: '1px solid var(--line-2)', color: 'var(--ink-1)' }
const inputCls = 'w-full px-3 py-2 rounded-xl focus:outline-none'
const labelCls = 'block text-sm font-medium mb-1'

export default function ContactStudioPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not send your message')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-2" style={{ color: 'var(--ink-1)' }}>Contact the studio</h2>
      {sent ? (
        <div>
          <p className="text-sm mb-4 mt-4" style={{ color: 'var(--ink-2)' }}>
            Thanks, {form.name.split(' ')[0] || 'there'}! Your message is on its way to the studio team — they&apos;ll get back to you soon.
          </p>
          <Link href="/login" className="link text-sm">← Back to sign in</Link>
        </div>
      ) : (
        <>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
            Questions about classes, billing, or your account? Send us a note.
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--ink-2)' }}>Name</label>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--ink-2)' }}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--ink-2)' }}>Email</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} style={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--ink-2)' }}>Subject</label>
              <input type="text" value={form.subject} onChange={e => set('subject', e.target.value)} className={inputCls} style={inputStyle} placeholder="What's this about?" />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--ink-2)' }}>Message</label>
              <textarea required rows={4} value={form.message} onChange={e => set('message', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
            <Link href="/login" className="link">← Back to sign in</Link>
          </p>
        </>
      )}
    </div>
  )
}
