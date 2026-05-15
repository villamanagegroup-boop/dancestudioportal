'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { STAFF_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type StaffRole } from '@/lib/permissions'

interface Props {
  onClose: () => void
  instructor?: any
}

export default function StaffFormModal({ onClose, instructor }: Props) {
  const router = useRouter()
  const editing = !!instructor
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    first_name: instructor?.first_name ?? '',
    last_name: instructor?.last_name ?? '',
    email: instructor?.email ?? '',
    phone: instructor?.phone ?? '',
    bio: instructor?.bio ?? '',
    specialties: (instructor?.specialties ?? []).join(', '),
    pay_rate: instructor?.pay_rate != null ? String(instructor.pay_rate) : '',
    pay_type: instructor?.pay_type ?? 'hourly',
    staff_role: (instructor?.staff_role ?? 'instructor') as StaffRole,
    background_check_date: instructor?.background_check_date ?? '',
    background_check_expires: instructor?.background_check_expires ?? '',
    active: instructor?.active ?? true,
  }))

  function set(field: string, value: string | boolean) { setForm(f => ({ ...f, [field]: value })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        specialties: form.specialties.split(',').map((s: string) => s.trim()).filter(Boolean),
        pay_rate: form.pay_rate === '' ? null : Number(form.pay_rate),
        pay_type: form.pay_type,
        staff_role: form.staff_role,
        background_check_date: form.background_check_date || null,
        background_check_expires: form.background_check_expires || null,
        active: form.active,
      }
      const res = await fetch(editing ? `/api/instructors/${instructor.id}` : '/api/instructors', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to save instructor')
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Instructor' : 'Add Instructor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.staff_role} onChange={e => set('staff_role', e.target.value)} className={inputCls}>
              {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[form.staff_role]}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
            <input value={form.specialties} onChange={e => set('specialties', e.target.value)} className={inputCls} placeholder="Ballet, Jazz, Contemporary" />
            <p className="text-xs text-gray-400 mt-1">Separate with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate ($)</label>
              <input type="number" min="0" step="0.01" value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
              <select value={form.pay_type} onChange={e => set('pay_type', e.target.value)} className={inputCls}>
                <option value="hourly">Hourly</option>
                <option value="per_class">Per Class</option>
                <option value="salary">Salary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BG Check Date</label>
              <input type="date" value={form.background_check_date} onChange={e => set('background_check_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BG Check Expires</label>
              <input type="date" value={form.background_check_expires} onChange={e => set('background_check_expires', e.target.value)} className={inputCls} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
            Active (visible for class assignment)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
