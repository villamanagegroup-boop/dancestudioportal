'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  BEFORE_CARE_TIMES, AFTER_CARE_TIMES, careHours, careAmount, type CareKind,
} from '@/lib/camp-care'
import type { CampCare } from '@/components/admin/CampDetail'

interface Props {
  campId: string
  regId: string
  lines: CampCare[]
}

// One registration's before/after care: a compact summary that expands into a
// line list + an add form. All money is $15/hr (CARE_RATE); hours derive from
// the drop-off/pickup time, exactly like the public registration form.
export default function CampCareCell({ campId, regId, lines }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [kind, setKind] = useState<CareKind>('after')
  const [time, setTime] = useState('4:30')
  const [days, setDays] = useState('1')
  const [date, setDate] = useState('')

  const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
  const unpaid = lines.filter(l => !l.paid)
  const unpaidTotal = unpaid.reduce((s, l) => s + Number(l.amount || 0), 0)

  const times = kind === 'before' ? BEFORE_CARE_TIMES : AFTER_CARE_TIMES
  const previewHours = careHours(kind, time)
  const previewDays = date ? 1 : Math.max(1, Math.floor(Number(days) || 1))
  const previewAmount = careAmount(previewHours, previewDays)

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Request failed')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function add() {
    if (kind !== 'before' && kind !== 'after') return
    const body: Record<string, unknown> = { kind, time }
    if (date) body.dates = [date]
    else body.days = Math.max(1, Math.floor(Number(days) || 1))
    call(`/api/camps/${campId}/registrations/${regId}/care`, 'POST', body)
  }

  async function importFromWebsite() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${campId}/registrations/${regId}/care/import`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      if (!json.imported) setError('No website care found for this camper/week.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-left"
      >
        {total > 0 ? (
          <span className={unpaidTotal > 0 ? 'text-amber-700 font-medium' : 'text-gray-500'}>
            {formatCurrency(total)}
            {unpaidTotal > 0 && <span className="text-amber-600"> · {formatCurrency(unpaidTotal)} due</span>}
          </span>
        ) : (
          <span className="text-gray-300 hover:text-studio-600">+ care</span>
        )}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-100 w-72 space-y-2">
          {lines.length > 0 && (
            <ul className="space-y-1">
              {lines.map(l => (
                <li key={l.id} className="flex items-center gap-2 text-xs">
                  <span className="capitalize text-gray-700 w-12">{l.kind}</span>
                  <span className="text-gray-500 flex-1">
                    {l.care_date
                      ? new Date(l.care_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                      : `${l.days} day${l.days > 1 ? 's' : ''}`}
                    {l.care_time ? ` · ${l.care_time}` : ''} · {Number(l.hours)}h
                  </span>
                  <span className="text-gray-700 w-12 text-right">{formatCurrency(Number(l.amount))}</span>
                  <button
                    onClick={() => call(`/api/camps/${campId}/registrations/${regId}/care/${l.id}`, 'PATCH', { paid: !l.paid })}
                    disabled={busy}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${l.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} disabled:opacity-50`}
                  >
                    {l.paid ? 'paid' : 'due'}
                  </button>
                  <button
                    onClick={() => call(`/api/camps/${campId}/registrations/${regId}/care/${l.id}`, 'DELETE')}
                    disabled={busy}
                    className="text-gray-300 hover:text-red-600 disabled:opacity-50"
                    aria-label="Remove care line"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add form */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
            <select
              value={kind}
              onChange={e => { const k = e.target.value as CareKind; setKind(k); setTime(k === 'before' ? '8:30' : '4:30') }}
              className="text-xs rounded border border-gray-200 px-1 py-1 bg-white"
            >
              <option value="before">Before</option>
              <option value="after">After</option>
            </select>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="text-xs rounded border border-gray-200 px-1 py-1 bg-white"
            >
              {times.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {date ? (
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-xs rounded border border-gray-200 px-1 py-1 bg-white w-28"
              />
            ) : (
              <input
                type="number"
                min="1"
                value={days}
                onChange={e => setDays(e.target.value)}
                className="text-xs rounded border border-gray-200 px-1 py-1 bg-white w-12"
                title="Number of days"
              />
            )}
            <button
              onClick={() => setDate(d => (d ? '' : new Date().toISOString().slice(0, 10)))}
              className="text-[10px] text-gray-400 hover:text-studio-600"
              title="Toggle specific date vs. day count"
            >
              {date ? '# days' : 'date'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Clock size={11} /> {previewHours}h × ${15} × {previewDays}d = <b className="text-gray-600">{formatCurrency(previewAmount)}</b>
            </span>
            <button
              onClick={add}
              disabled={busy || !(previewHours > 0)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <button
            onClick={importFromWebsite}
            disabled={busy}
            className="text-[11px] text-gray-400 hover:text-studio-600 disabled:opacity-50"
          >
            ⤓ Import from website submission
          </button>
          {error && <div className="text-[11px] text-red-600">{error}</div>}
        </div>
      )}
    </div>
  )
}
