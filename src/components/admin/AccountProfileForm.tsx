'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

interface Form {
  first_name: string
  last_name: string
  phone: string
  email: string
  secondary_email: string
  secondary_phone: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  email_opt_in: boolean
  sms_opt_in: boolean
  job_title: string
  bio: string
  photo_url: string
}

const EMPTY: Form = {
  first_name: '', last_name: '', phone: '', email: '',
  secondary_email: '', secondary_phone: '',
  address_street: '', address_city: '', address_state: '', address_zip: '',
  email_opt_in: true, sms_opt_in: false,
  job_title: '', bio: '', photo_url: '',
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-studio-500'
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'

export default function AccountProfileForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  useEffect(() => {
    fetch('/api/account/profile').then(async r => {
      const d = await r.json()
      if (d.profile) {
        setForm({
          first_name: d.profile.first_name ?? '',
          last_name: d.profile.last_name ?? '',
          phone: d.profile.phone ?? '',
          email: d.profile.email ?? '',
          secondary_email: d.profile.secondary_email ?? '',
          secondary_phone: d.profile.secondary_phone ?? '',
          address_street: d.profile.address_street ?? '',
          address_city: d.profile.address_city ?? '',
          address_state: d.profile.address_state ?? '',
          address_zip: d.profile.address_zip ?? '',
          email_opt_in: d.profile.email_opt_in ?? true,
          sms_opt_in: d.profile.sms_opt_in ?? false,
          job_title: d.profile.job_title ?? '',
          bio: d.profile.bio ?? '',
          photo_url: d.profile.photo_url ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(''); setSaved(false)
    const { email, ...editable } = form
    const res = await fetch('/api/account/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editable),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSubmitting(false); return }
    setSaved(true); setSubmitting(false)
    router.refresh()
  }

  if (loading) return <p className="text-sm text-gray-500 p-5">Loading…</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {/* Profile — photo, title, bio */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your photo, title, and bio as they appear to the team.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-xl flex-shrink-0">
              {form.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                : `${(form.first_name[0] ?? '').toUpperCase()}${(form.last_name[0] ?? '').toUpperCase()}` || '·'}
            </div>
            <div className="flex-1">
              <label className={labelCls}>Photo URL</label>
              <input type="url" value={form.photo_url} onChange={e => set('photo_url', e.target.value)} placeholder="https://…" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Title / role</label>
            <input type="text" value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="e.g. Studio Owner, Front Desk Manager" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="A short bio…" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Contact details</h2>
          <p className="text-xs text-gray-500 mt-0.5">How the studio reaches you and how your name appears.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First name</label>
              <input type="text" required value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input type="text" required value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
              <p className="text-xs text-gray-400 mt-1">Your login email — contact the studio to change it.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Secondary email</label>
              <input type="email" value={form.secondary_email} onChange={e => set('secondary_email', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Secondary phone</label>
              <input type="tel" value={form.secondary_phone} onChange={e => set('secondary_phone', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Mailing address</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Street</label>
            <input type="text" value={form.address_street} onChange={e => set('address_street', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <label className={labelCls}>City</label>
              <input type="text" value={form.address_city} onChange={e => set('address_city', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-1">
              <label className={labelCls}>State</label>
              <input type="text" value={form.address_state} onChange={e => set('address_state', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>ZIP</label>
              <input type="text" value={form.address_zip} onChange={e => set('address_zip', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Communication preferences</h2>
        </div>
        <div className="p-5 space-y-3">
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.email_opt_in} onChange={e => set('email_opt_in', e.target.checked)} className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
            Email me studio updates, reminders, and announcements
          </label>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.sms_opt_in} onChange={e => set('sms_opt_in', e.target.checked)} className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
            Text me time-sensitive alerts (closures, schedule changes)
          </label>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
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
  )
}
