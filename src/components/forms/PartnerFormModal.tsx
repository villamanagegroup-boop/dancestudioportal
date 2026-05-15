'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  partner?: any
}

const TYPES = [
  { value: 'studio', label: 'Dance Studio' },
  { value: 'business', label: 'Local Business' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'venue', label: 'Venue' },
  { value: 'other', label: 'Other' },
]

const RATE_UNITS = [
  { value: 'flat', label: 'Flat rate' },
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'event', label: 'Per event' },
  { value: 'month', label: 'Per month' },
]

export default function PartnerFormModal({ onClose, partner }: Props) {
  const router = useRouter()
  const editing = !!partner
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    name: partner?.name ?? '',
    partner_type: partner?.partner_type ?? 'business',
    contact_name: partner?.contact_name ?? '',
    email: partner?.email ?? '',
    phone: partner?.phone ?? '',
    website: partner?.website ?? '',
    rate_amount: partner?.rate_amount != null ? String(partner.rate_amount) : '',
    rate_unit: partner?.rate_unit ?? 'flat',
    notes: partner?.notes ?? '',
  }))

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Partner name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(editing ? `/api/partners/${partner.id}` : '/api/partners', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to save partner')
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
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Partner' : 'Add Partner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Midlothian Music Co." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.partner_type} onChange={e => set('partner_type', e.target.value)} className={inputCls}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} className={inputCls} placeholder="https://" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($)</label>
              <input type="number" min="0" step="0.01" value={form.rate_amount} onChange={e => set('rate_amount', e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Basis</label>
              <select value={form.rate_unit} onChange={e => set('rate_unit', e.target.value)} className={inputCls}>
                {RATE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Partnership details, agreements, contacts…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
