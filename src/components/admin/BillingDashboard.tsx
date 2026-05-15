'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate, getPaymentStatusColor } from '@/lib/utils'
import { DollarSign, Clock, AlertTriangle, ChevronUp, ChevronDown, Search, Pencil, Trash2, Check } from 'lucide-react'
import InvoiceFormModal from '@/components/forms/InvoiceFormModal'

type SortKey = 'guardian' | 'student' | 'amount' | 'due' | 'status'
type SortDir = 'asc' | 'desc'

interface Invoice {
  id: string
  guardian_id: string
  student_id: string | null
  description: string
  amount: number
  due_date: string | null
  status: string
  invoice_type: string
  created_at: string
  paid_at: string | null
  notes: string | null
  guardian: { first_name: string; last_name: string; email: string } | null
  student: { first_name: string; last_name: string } | null
}

interface Props {
  invoices: Invoice[]
  guardians: { id: string; first_name: string; last_name: string }[]
  students: { id: string; first_name: string; last_name: string }[]
  collectedThisMonth: number
  outstanding: number
  overdue: number
}

const TABS = ['All Invoices', 'Outstanding', 'Overdue', 'Paid'] as const
type Tab = typeof TABS[number]

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

export default function BillingDashboard({ invoices, guardians, students, collectedThisMonth, outstanding, overdue }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('All Invoices')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const today = new Date()

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('asc') }
  }

  const counts = useMemo(() => ({
    outstanding: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'pending' && i.due_date && new Date(i.due_date) < today).length,
  }), [invoices, today])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices
      .filter(inv => {
        if (activeTab === 'Outstanding') { if (inv.status !== 'pending') return false }
        else if (activeTab === 'Overdue') { if (!(inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today)) return false }
        else if (activeTab === 'Paid') { if (inv.status !== 'paid') return false }
        if (q) {
          const hay = `${inv.guardian?.first_name ?? ''} ${inv.guardian?.last_name ?? ''} ${inv.student?.first_name ?? ''} ${inv.student?.last_name ?? ''} ${inv.description}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'guardian') cmp = (a.guardian ? `${a.guardian.last_name} ${a.guardian.first_name}` : '').localeCompare(b.guardian ? `${b.guardian.last_name} ${b.guardian.first_name}` : '')
        else if (sortKey === 'student') cmp = (a.student ? `${a.student.last_name} ${a.student.first_name}` : '').localeCompare(b.student ? `${b.student.last_name} ${b.student.first_name}` : '')
        else if (sortKey === 'amount') cmp = Number(a.amount) - Number(b.amount)
        else if (sortKey === 'due') cmp = (a.due_date ?? '').localeCompare(b.due_date ?? '')
        else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [invoices, activeTab, query, sortKey, sortDir, today])

  async function patchInvoice(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to update invoice')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Permanently delete this invoice? Linked payment records will also be removed.')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete invoice')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const cards = [
    { label: 'Collected This Month', value: formatCurrency(collectedThisMonth), icon: DollarSign, border: 'border-green-100', iconBg: 'bg-green-50 text-green-600', sub: null },
    { label: 'Outstanding', value: formatCurrency(outstanding), icon: Clock, border: 'border-yellow-100', iconBg: 'bg-yellow-50 text-yellow-600', sub: `${counts.outstanding} invoice${counts.outstanding === 1 ? '' : 's'}` },
    { label: 'Overdue', value: formatCurrency(overdue), icon: AlertTriangle, border: 'border-red-100', iconBg: 'bg-red-50 text-red-600', sub: `${counts.overdue} invoice${counts.overdue === 1 ? '' : 's'}` },
  ]

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border ${c.border} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center`}>
                <c.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search guardian, student, description…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
            />
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
          >
            Create Invoice
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {([['guardian', 'Guardian'], ['student', 'Student']] as [SortKey, string][]).map(([col, label]) => (
                  <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                    {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                {([['amount', 'Amount'], ['due', 'Due'], ['status', 'Status']] as [SortKey, string][]).map(([col, label]) => (
                  <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                    {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => {
                const isOverdue = inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {inv.guardian ? `${inv.guardian.first_name} ${inv.guardian.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {inv.student ? `${inv.student.first_name} ${inv.student.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {inv.description}
                      <span className="ml-2 text-xs text-gray-400 capitalize">· {inv.invoice_type}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.amount))}</td>
                    <td className={cn('px-5 py-3 text-sm', isOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', getPaymentStatusColor(inv.status))}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => patchInvoice(inv.id, { status: 'paid' })}
                            disabled={busyId === inv.id}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-md hover:bg-green-50 disabled:opacity-50"
                          >
                            <Check size={13} /> Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(inv)}
                          disabled={busyId === inv.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          aria-label="Edit invoice"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          disabled={busyId === inv.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Delete invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No invoices found</div>
          )}
        </div>
      </div>

      {showCreate && <InvoiceFormModal onClose={() => setShowCreate(false)} guardians={guardians} students={students} />}
      {editing && <InvoiceFormModal onClose={() => setEditing(null)} guardians={guardians} students={students} invoice={editing} />}
    </>
  )
}
