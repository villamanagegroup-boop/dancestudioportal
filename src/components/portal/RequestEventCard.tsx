'use client'

import { useState } from 'react'

const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500'
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'

export default function RequestEventCard() {
  const [form, setForm] = useState({ request_type: 'party', preferred_date: '', guest_count: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/portal/event-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not send your request')
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">Request sent!</h3>
        <p className="text-sm text-gray-600 mt-1">
          The studio has your request and will reach out to confirm the details.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900">Request a party or event</h3>
        <p className="text-sm text-gray-500 mt-0.5">Tell us what you have in mind and we&apos;ll follow up.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select value={form.request_type} onChange={e => set('request_type', e.target.value)} className={inputCls}>
            <option value="party">Birthday party</option>
            <option value="event">Studio event</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Preferred date</label>
          <input type="date" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Estimated guests</label>
        <input type="number" min={0} value={form.guest_count} onChange={e => set('guest_count', e.target.value)} placeholder="Optional" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Details</label>
        <textarea rows={3} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Anything we should know?" className={inputCls} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send request'}
      </button>
    </form>
  )
}
