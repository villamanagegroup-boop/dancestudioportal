'use client'

import { useState } from 'react'
import { cn, formatCurrency, formatDate, getPaymentStatusColor } from '@/lib/utils'
import { DollarSign, Clock, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'

type SortKey = 'guardian' | 'student' | 'amount' | 'due' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}
import InvoiceFormModal from '@/components/forms/InvoiceFormModal'
import { useRouter } from 'next/navigation'

interface Invoice {
  id: string
  description: string
  amount: number
  due_date: string | null
  status: string
  invoice_type: string
  created_at: string
  paid_at: string | null
  guardian: { first_name: string; last_name: string; email: string } | null
  student: { first_name: string; last_name: string } | null
}

interface Props {
  invoices: Invoice[]
  collectedThisMonth: number
  outstanding: number
  overdue: number
}

const TABS = ['All Invoices', 'Outstanding', 'Overdue', 'Paid'] as const
type Tab = typeof TABS[number]

export default function BillingDashboard({ invoices, collectedThisMonth, outstanding, overdue }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('All Invoices')
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const today = new Date()

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = invoices
    .filter(inv => {
      if (activeTab === 'Outstanding') return inv.status === 'pending'
      if (activeTab === 'Overdue') return inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today
      if (activeTab === 'Paid') return inv.status === 'paid'
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

  async function markPaid(invoiceId: string) {
    await fetch(`/api/invoices/${invoiceId}/mark-paid`, { method: 'POST' })
    router.refresh()
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-green-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Collected This Month</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(collectedThisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Outstanding</p>
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock size={16} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Overdue</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(overdue)}</p>
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
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
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-900">
                    {inv.guardian ? `${inv.guardian.first_name} ${inv.guardian.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {inv.student ? `${inv.student.first_name} ${inv.student.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{inv.description}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.amount))}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getPaymentStatusColor(inv.status))}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        className="text-xs font-medium text-studio-600 hover:text-studio-700"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No invoices found</div>
          )}
        </div>
      </div>
      {showModal && <InvoiceFormModal onClose={() => setShowModal(false)} />}
    </>
  )
}
