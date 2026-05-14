'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CalendarEvent {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  all_day: boolean
  start_time: string | null
  end_time: string | null
  room_id: string | null
  notes: string | null
}

interface Props {
  onClose: () => void
  rooms: { id: string; name: string }[]
  event?: CalendarEvent
  defaults?: Partial<Record<string, string>>
}

const TYPES = [
  { value: 'event', label: 'Event' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'blackout', label: 'Blackout' },
  { value: 'placeholder', label: 'Placeholder' },
]

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function CalendarEventModal({ onClose, rooms, event, defaults }: Props) {
  const router = useRouter()
  const editing = !!event
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: event?.title ?? '',
    event_type: event?.event_type ?? defaults?.event_type ?? 'event',
    start_date: event?.start_date ?? defaults?.start_date ?? '',
    end_date: event?.end_date ?? '',
    all_day: event?.all_day ?? false,
    start_time: event?.start_time?.slice(0, 5) ?? defaults?.start_time ?? '',
    end_time: event?.end_time?.slice(0, 5) ?? '',
    room_id: event?.room_id ?? '',
    notes: event?.notes ?? '',
  })

  function set(key: keyof typeof form, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.start_date) {
      setError('Title and start date are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        editing ? `/api/calendar-events/${event!.id}` : '/api/calendar-events',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    if (!event || !confirm('Delete this calendar item?')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/calendar-events/${event.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete')
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Calendar Item' : 'New Calendar Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={field} placeholder="e.g. Staff meeting, Studio closed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className={field}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={field} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.all_day} onChange={e => set('all_day', e.target.checked)} className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500" />
            <span className="text-sm font-medium text-gray-700">All day</span>
          </label>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={field} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={field} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className={field}>
              <option value="">None / whole studio</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={field + ' resize-none'} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            {editing && (
              <button type="button" onClick={remove} disabled={submitting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 mr-auto">
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 ${editing ? '' : 'ml-auto'}`}>Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
