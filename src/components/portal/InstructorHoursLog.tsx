'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface HoursEntry {
  id: string
  worked_on: string
  hours: number
  notes: string | null
  approved_at: string | null
}

interface Props {
  entries: HoursEntry[]
}

const fieldCls = 'px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'
const fieldStyle = { borderColor: 'var(--line)', background: 'rgba(255,255,255,0.6)' }

export default function InstructorHoursLog({ entries }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ worked_on: '', hours: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function add() {
    if (!form.worked_on || !form.hours) {
      setError('Date and hours are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/portal/instructor-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worked_on: form.worked_on, hours: Number(form.hours), notes: form.notes || null }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to log hours')
      }
      setForm({ worked_on: '', hours: '', notes: '' })
      setAdding(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      const res = await fetch(`/api/portal/instructor-hours/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          {entries.length} entries logged. Approved entries can't be deleted.
        </p>
        <button
          onClick={() => setAdding(a => !a)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}
        >
          <Plus size={14} /> {adding ? 'Cancel' : 'Log hours'}
        </button>
      </div>

      {adding && (
        <div className="p-4 rounded-lg mb-4 flex flex-wrap items-end gap-3" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid var(--line)' }}>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Date</label>
            <input
              type="date"
              value={form.worked_on}
              onChange={e => setForm(f => ({ ...f, worked_on: e.target.value }))}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Hours</label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.25"
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
              className={fieldCls + ' w-24'}
              style={fieldStyle}
              placeholder="0.0"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className={fieldCls + ' w-full'}
              style={fieldStyle}
              placeholder="What you worked on"
            />
          </div>
          <button
            onClick={add}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}
          >
            {submitting ? 'Logging…' : 'Submit'}
          </button>
          {error && <p className="w-full text-sm" style={{ color: '#dc2626' }}>{error}</p>}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No hours logged yet.</p>
      ) : (
        <div className="tight-list">
          {entries.map(e => (
            <div key={e.id} className="tl-row">
              <div className="tl-lead">
                <div className="t">{formatDate(e.worked_on)}</div>
                <div className="s">{Number(e.hours).toFixed(2)}h</div>
              </div>
              <div className="tl-main">
                <div className="t">{Number(e.hours).toFixed(2)} hours</div>
                <div className="s">{e.notes || 'No notes'}</div>
              </div>
              <div className="tl-trail">
                {e.approved_at ? (
                  <span className="tag tag-mint">Approved</span>
                ) : (
                  <>
                    <span className="tag tag-blue">Pending</span>
                    <button
                      onClick={() => remove(e.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: 'var(--ink-3)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
