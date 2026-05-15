'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GuardianOption { id: string; first_name: string; last_name: string }
interface StudentOption { id: string; first_name: string; last_name: string }

interface Props {
  onClose: () => void
  guardians: GuardianOption[]
  students: StudentOption[]
  invoice?: any
}

const INVOICE_TYPES = ['tuition', 'registration', 'costume', 'recital', 'retail', 'other'] as const

export default function InvoiceFormModal({ onClose, guardians, students, invoice }: Props) {
  const router = useRouter()
  const editing = !!invoice
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    guardian_id: invoice?.guardian_id ?? '',
    student_id: invoice?.student_id ?? '',
    invoice_type: invoice?.invoice_type ?? 'tuition',
    description: invoice?.description ?? '',
    amount: invoice?.amount != null ? String(invoice.amount) : '',
    due_date: invoice?.due_date ?? '',
    status: invoice?.status ?? 'pending',
    notes: invoice?.notes ?? '',
  }))

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guardian_id) { setError('Select a guardian.'); return }
    if (!form.description.trim()) { setError('Description is required.'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Amount must be greater than 0.'); return }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        guardian_id: form.guardian_id,
        student_id: form.student_id || null,
        invoice_type: form.invoice_type,
        description: form.description.trim(),
        amount: Number(form.amount),
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        ...(editing ? { status: form.status } : {}),
      }
      const res = await fetch(editing ? `/api/invoices/${invoice.id}` : '/api/invoices', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to save invoice')
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian *</label>
            <select value={form.guardian_id} onChange={e => set('guardian_id', e.target.value)} className={fieldClass}>
              <option value="">Select guardian…</option>
              {guardians.map(g => <option key={g.id} value={g.id}>{g.last_name}, {g.first_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select value={form.student_id} onChange={e => set('student_id', e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select value={form.invoice_type} onChange={e => set('invoice_type', e.target.value)} className={fieldClass}>
              {INVOICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} className={fieldClass} placeholder="e.g. October tuition — Ballet I" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={fieldClass} />
            </div>
          </div>

          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={fieldClass}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="waived">Waived</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${fieldClass} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
