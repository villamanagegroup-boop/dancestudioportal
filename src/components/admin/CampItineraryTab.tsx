'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X, MapPin } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import type { CampItineraryItem } from '@/components/admin/CampDetail'

interface Props {
  campId: string
  startDate: string
  endDate: string
  itinerary: CampItineraryItem[]
}

function campDays(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  let guard = 0
  while (d <= last && guard < 366) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
    guard++
  }
  return days
}

const field =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function CampItineraryTab({ campId, startDate, endDate, itinerary }: Props) {
  const router = useRouter()
  const days = campDays(startDate, endDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const [form, setForm] = useState({
    day_date: days[0] ?? '',
    start_time: '',
    end_time: '',
    title: '',
    location: '',
    notes: '',
  })

  function setF(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function add() {
    if (!form.day_date || !form.title.trim()) {
      setError('Day and title are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to add item')
      }
      setForm(f => ({ ...f, start_time: '', end_time: '', title: '', location: '', notes: '' }))
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(id: string, patch: Partial<CampItineraryItem>) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/itinerary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save item')
      }
      setEditId(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/itinerary/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete item')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const byDay = days.map(d => ({
    day: d,
    items: itinerary
      .filter(it => it.day_date === d)
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          (a.start_time ?? '').localeCompare(b.start_time ?? ''),
      ),
  }))

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Itinerary Item</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
            <select value={form.day_date} onChange={e => setF('day_date', e.target.value)} className={field}>
              {days.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
            <input type="time" value={form.start_time} onChange={e => setF('start_time', e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
            <input type="time" value={form.end_time} onChange={e => setF('end_time', e.target.value)} className={field} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <input value={form.location} onChange={e => setF('location', e.target.value)} className={field} placeholder="Studio A" />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input value={form.title} onChange={e => setF('title', e.target.value)} className={field} placeholder="Warm-up & stretch" />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={add}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50 w-full justify-center"
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setF('notes', e.target.value)} className={field} placeholder="Optional" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Day-by-day */}
      <div className="space-y-4">
        {byDay.map(({ day, items }) => (
          <div key={day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-900">{formatDate(day)}</h3>
            </div>
            {items.length === 0 ? (
              <div className="px-5 py-6 text-center text-gray-300 text-sm">No items scheduled</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(it =>
                  editId === it.id ? (
                    <EditRow
                      key={it.id}
                      item={it}
                      busy={busy}
                      onCancel={() => setEditId(null)}
                      onSave={patch => saveEdit(it.id, patch)}
                    />
                  ) : (
                    <div key={it.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-28 text-xs text-gray-500 shrink-0">
                        {it.start_time
                          ? `${formatTime(it.start_time)}${it.end_time ? ` – ${formatTime(it.end_time)}` : ''}`
                          : 'All day'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{it.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {it.location && (
                            <span className="flex items-center gap-1"><MapPin size={11} /> {it.location}</span>
                          )}
                          {it.notes && <span className="truncate">{it.notes}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditId(it.id)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-studio-600 hover:bg-gray-100 disabled:opacity-50"
                        aria-label="Edit item"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(it.id, it.title)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Delete item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditRow({
  item, busy, onCancel, onSave,
}: {
  item: CampItineraryItem
  busy: boolean
  onCancel: () => void
  onSave: (patch: Partial<CampItineraryItem>) => void
}) {
  const [t, setT] = useState({
    start_time: item.start_time?.slice(0, 5) ?? '',
    end_time: item.end_time?.slice(0, 5) ?? '',
    title: item.title,
    location: item.location ?? '',
    notes: item.notes ?? '',
  })
  const cls = 'px-2 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:border-studio-500'
  return (
    <div className="flex items-center gap-2 px-5 py-3 bg-studio-50/40 flex-wrap">
      <input type="time" value={t.start_time} onChange={e => setT(s => ({ ...s, start_time: e.target.value }))} className={cls + ' w-28'} />
      <input type="time" value={t.end_time} onChange={e => setT(s => ({ ...s, end_time: e.target.value }))} className={cls + ' w-28'} />
      <input value={t.title} onChange={e => setT(s => ({ ...s, title: e.target.value }))} className={cls + ' flex-1 min-w-40'} placeholder="Title" />
      <input value={t.location} onChange={e => setT(s => ({ ...s, location: e.target.value }))} className={cls + ' w-36'} placeholder="Location" />
      <input value={t.notes} onChange={e => setT(s => ({ ...s, notes: e.target.value }))} className={cls + ' w-40'} placeholder="Notes" />
      <button
        onClick={() => onSave(t as Partial<CampItineraryItem>)}
        disabled={busy || !t.title.trim()}
        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
        aria-label="Save"
      >
        <Check size={16} />
      </button>
      <button
        onClick={onCancel}
        disabled={busy}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-50"
        aria-label="Cancel"
      >
        <X size={16} />
      </button>
    </div>
  )
}
