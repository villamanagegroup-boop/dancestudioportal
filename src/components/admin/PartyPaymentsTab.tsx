'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  party: any
}

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function PartyPaymentsTab({ party }: Props) {
  const router = useRouter()
  const [price, setPrice] = useState(party.price != null ? String(party.price) : '')
  const [depositAmount, setDepositAmount] = useState(
    party.deposit_amount != null ? String(party.deposit_amount) : '',
  )
  const [amountPaid, setAmountPaid] = useState(
    party.amount_paid != null ? String(party.amount_paid) : '0',
  )
  const [depositPaid, setDepositPaid] = useState<boolean>(!!party.deposit_paid)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const priceN = Number(price) || 0
  const paidN = Number(amountPaid) || 0
  const balance = Math.max(0, priceN - paidN)

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: priceN,
          deposit_amount: depositAmount === '' ? '' : Number(depositAmount),
          amount_paid: paidN,
          deposit_paid: depositPaid,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Rollup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Price" value={formatCurrency(priceN)} tone="text-gray-900" />
        <Stat label="Collected" value={formatCurrency(paidN)} tone="text-green-600" />
        <Stat label="Balance Due" value={formatCurrency(balance)} tone={balance > 0 ? 'text-red-500' : 'text-gray-900'} />
        <Stat
          label="Deposit"
          value={depositPaid ? 'Paid' : 'Pending'}
          tone={depositPaid ? 'text-green-600' : 'text-yellow-600'}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Payment Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Price ($)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount ($)</label>
            <input type="number" min="0" step="0.01" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className={field} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Collected ($)</label>
            <input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className={field} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer md:col-span-3">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={e => setDepositPaid(e.target.checked)}
              className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
            />
            <span className="text-sm font-medium text-gray-700">Deposit paid</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-red-600 mr-auto">{error}</span>}
          {savedAt && !saving && <span className="text-sm text-green-600">Saved</span>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}
