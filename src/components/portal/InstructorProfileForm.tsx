'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

interface Props {
  instructor: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    bio: string | null
    specialties: string[] | null
  }
}

const fieldCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'
const fieldStyle = { borderColor: 'var(--line)', background: 'rgba(255,255,255,0.6)' }

export default function InstructorProfileForm({ instructor }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: instructor.first_name ?? '',
    last_name: instructor.last_name ?? '',
    email: instructor.email ?? '',
    phone: instructor.phone ?? '',
    bio: instructor.bio ?? '',
    specialties: (instructor.specialties ?? []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        specialties: form.specialties.split(',').map((s: string) => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/portal/instructor-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>First name</label>
          <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={fieldCls} style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Last name</label>
          <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={fieldCls} style={fieldStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={fieldCls} style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Phone</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={fieldCls} style={fieldStyle} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Bio</label>
        <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className={fieldCls + ' resize-none'} style={fieldStyle} />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Specialties</label>
        <input value={form.specialties} onChange={e => set('specialties', e.target.value)} className={fieldCls} style={fieldStyle} placeholder="Ballet, Jazz, Contemporary" />
        <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Separate with commas.</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && !saving && (
          <span className="text-sm flex items-center gap-1" style={{ color: '#16a34a' }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </form>
  )
}
