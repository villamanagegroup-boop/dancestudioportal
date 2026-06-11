'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'

// One bulk-editable field. `type` drives the input rendered in the modal.
export interface BulkField {
  key: string
  label: string
  type: 'text' | 'number' | 'currency' | 'date' | 'time' | 'select' | 'boolean'
  options?: { value: string; label: string }[]   // for `select`
  placeholder?: string
}

interface Props {
  ids: string[]                 // selected row ids
  endpointBase: string          // e.g. '/api/camps' — PATCH {endpointBase}/{id}
  entityLabel: string           // singular, e.g. 'camp'
  fields: BulkField[]
  onClear: () => void
}

export default function BulkEditBar({ ids, endpointBase, entityLabel, fields, onClear }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ids.length === 0) return null

  const count = ids.length
  const plural = count === 1 ? entityLabel : `${entityLabel}s`

  function reset() {
    setEnabled({})
    setValues({})
    setError(null)
  }

  function coerce(field: BulkField, raw: string): unknown {
    if (field.type === 'boolean') return raw === 'true'
    if (field.type === 'number' || field.type === 'currency') {
      if (raw === '') return ''           // PATCH route nulls blanks where allowed
      return Number(raw)
    }
    return raw
  }

  async function apply() {
    const patch: Record<string, unknown> = {}
    for (const f of fields) {
      if (enabled[f.key]) patch[f.key] = coerce(f, values[f.key] ?? '')
    }
    if (Object.keys(patch).length === 0) {
      setError('Pick at least one field to change.')
      return
    }
    setSaving(true)
    setError(null)
    const results = await Promise.all(
      ids.map(id =>
        fetch(`${endpointBase}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).then(r => r.ok).catch(() => false),
      ),
    )
    setSaving(false)
    const failed = results.filter(ok => !ok).length
    if (failed > 0) {
      setError(`${failed} of ${count} failed to update.`)
      return
    }
    setOpen(false)
    reset()
    onClear()
    router.refresh()
  }

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white rounded-full pl-5 pr-2 py-2 shadow-xl">
        <span className="text-sm font-medium">{count} selected</span>
        <button
          onClick={() => { reset(); setOpen(true) }}
          className="flex items-center gap-1.5 bg-studio-600 hover:bg-studio-500 text-white text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors"
        >
          <Pencil size={14} /> Bulk edit
        </button>
        <button onClick={onClear} aria-label="Clear selection" className="p-1.5 rounded-full hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !saving && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Bulk edit {count} {plural}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Only the fields you check will change. Everything else is left as-is.</p>
              </div>
              <button onClick={() => !saving && setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-6 py-4 overflow-y-auto space-y-3">
              {fields.map(f => {
                const on = !!enabled[f.key]
                return (
                  <div key={f.key} className={`rounded-xl border p-3 transition-colors ${on ? 'border-studio-300 bg-studio-50/40' : 'border-gray-150'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={e => setEnabled(prev => ({ ...prev, [f.key]: e.target.checked }))}
                        className="rounded border-gray-300 text-studio-600 focus:ring-studio-500"
                      />
                      <span className="text-sm font-medium text-gray-800">{f.label}</span>
                    </label>
                    {on && (
                      <div className="mt-2 pl-6">
                        {f.type === 'select' ? (
                          <select
                            value={values[f.key] ?? ''}
                            onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
                          >
                            <option value="">— Select —</option>
                            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : f.type === 'boolean' ? (
                          <select
                            value={values[f.key] ?? 'true'}
                            onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type={f.type === 'currency' || f.type === 'number' ? 'number' : f.type}
                            step={f.type === 'currency' ? '0.01' : undefined}
                            value={values[f.key] ?? ''}
                            placeholder={f.placeholder}
                            onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {error ? <p className="text-xs text-red-600">{error}</p> : <span className="text-xs text-gray-400">Applies to {count} {plural}</span>}
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                <button onClick={apply} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Applying…' : `Apply to ${count}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
