'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import RowActions from '@/components/admin/RowActions'

interface TaxRate {
  id: string
  name: string
  rate: number
  region: string | null
  active: boolean
}

const fieldClass = 'px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500'

export default function TaxRatesManager({ taxRates }: { taxRates: TaxRate[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', rate: '', region: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function add() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to add tax rate')
      }
      setForm({ name: '', rate: '', region: '' })
      setAdding(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Tax Rates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Applied to taxable charges and point-of-sale items</p>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700"
        >
          <Plus size={15} /> Add Rate
        </button>
      </div>

      {adding && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name (e.g. VA Sales Tax)"
            className={fieldClass + ' flex-1 min-w-[160px]'}
          />
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" step="0.0001"
              value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
              placeholder="Rate"
              className={fieldClass + ' w-24'}
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
          <input
            value={form.region}
            onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
            placeholder="Region (optional)"
            className={fieldClass + ' w-40'}
          />
          <button
            onClick={add}
            disabled={submitting}
            className="px-3 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
          <button onClick={() => { setAdding(false); setError('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      )}

      {taxRates.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No tax rates configured</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Region</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {taxRates.map(t => (
              <tr key={t.id} className="group hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{Number(t.rate)}%</td>
                <td className="px-5 py-3 text-sm text-gray-600">{t.region ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                  )}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                  <RowActions
                    endpoint={`/api/tax-rates/${t.id}`}
                    entityLabel="tax rate"
                    archived={!t.active}
                    archivePatch={{ active: false }}
                    restorePatch={{ active: true }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
