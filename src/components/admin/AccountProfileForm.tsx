'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

export default function AccountProfileForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/account/profile').then(async r => {
      const d = await r.json()
      if (d.profile) {
        setFirstName(d.profile.first_name ?? '')
        setLastName(d.profile.last_name ?? '')
        setPhone(d.profile.phone ?? '')
        setEmail(d.profile.email ?? '')
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(''); setSaved(false)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSubmitting(false); return }
    setSaved(true); setSubmitting(false)
    router.refresh()
  }

  if (loading) return <p className="text-sm text-gray-500 p-5">Loading…</p>

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Your account</h2>
        <p className="text-sm text-gray-500 mt-0.5">This is how your name appears in greetings and on messages you send.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">First name</label>
            <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-studio-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Last name</label>
            <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-studio-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-studio-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input type="email" value={email} disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400 mt-1">Email is your login and can&apos;t be changed here.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Save changes
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
