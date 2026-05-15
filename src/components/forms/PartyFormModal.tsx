'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type EventType = 'party' | 'recital' | 'event'

interface Props {
  onClose: () => void
  rooms: { id: string; name: string }[]
  defaults?: Partial<Record<string, string>>
  eventType?: EventType
}

const TYPE_COPY: Record<EventType, { title: string; nameLabel: string }> = {
  party: { title: 'Book Party', nameLabel: 'Contact Name *' },
  recital: { title: 'Add Recital', nameLabel: 'Recital Name *' },
  event: { title: 'Add Studio Event', nameLabel: 'Event Name *' },
}

export default function PartyFormModal({ onClose, rooms, defaults, eventType = 'party' }: Props) {
  const router = useRouter()
  const copy = TYPE_COPY[eventType]
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '',
    event_date: '', start_time: '', end_time: '',
    guest_count: '', package: '', price: '',
    room_id: '', notes: '', status: 'inquiry',
    ...defaults,
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.contact_name || !form.event_date || !form.start_time || !form.end_time) {
      setError('Contact name, date, and times are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          event_type: eventType,
          guest_count: form.guest_count ? Number(form.guest_count) : null,
          price: Number(form.price) || 0,
          room_id: form.room_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to book party')
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
          <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{copy.nameLabel}</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start *</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End *</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className={inputCls}>
                <option value="">None</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count</label>
              <input type="number" min="1" value={form.guest_count} onChange={e => set('guest_count', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
              <select value={form.package} onChange={e => set('package', e.target.value)} className={inputCls}>
                <option value="">None</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="deluxe">Deluxe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="inquiry">Inquiry</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Book Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
