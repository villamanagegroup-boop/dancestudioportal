'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileSpreadsheet, Filter, Clock } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { ReportColumn, ReportResult, ReportFilters } from '@/lib/report-runners'
import type { ReportDef } from '@/lib/reports'

interface Props {
  def: ReportDef
  filters: ReportFilters
  result: ReportResult | null
}

function formatCell(v: any, format: ReportColumn['format']) {
  if (v == null || v === '') return ''
  if (format === 'date') return new Date(v + (String(v).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (format === 'datetime') return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  if (format === 'currency') return formatCurrency(Number(v))
  if (format === 'number') return Number(v).toLocaleString()
  return String(v)
}

function csvCell(v: any) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function ReportViewer({ def, filters, result }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(filters.from ?? '')
  const [to, setTo] = useState(filters.to ?? '')
  const [q, setQ] = useState(filters.q ?? '')

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (q) params.set('q', q)
    const qs = params.toString()
    router.push(`/reports/${def.id}${qs ? `?${qs}` : ''}`)
  }

  function clearFilters() {
    setFrom(''); setTo(''); setQ('')
    router.push(`/reports/${def.id}`)
  }

  function exportCsv() {
    if (!result) return
    const lines = [
      result.columns.map(c => csvCell(c.label)).join(','),
      ...result.rows.map(r => result.columns.map(c => csvCell(r[c.key])).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${def.id}-${def.title.replace(/\s+/g, '_').toLowerCase()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500'

  if (def.status === 'coming_soon') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <Clock size={32} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{def.title}</h2>
        <p className="text-sm text-gray-500 mb-4">{def.description}</p>
        <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
          Coming soon — this report needs a module that isn't built yet.
        </span>
        <div className="mt-6">
          <Link href="/reports" className="text-sm font-medium text-studio-600 hover:text-studio-700">← Back to Reports</Link>
        </div>
      </div>
    )
  }

  const rows = result?.rows ?? []
  const columns = result?.columns ?? []

  return (
    <div className="space-y-5">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-studio-600 hover:text-studio-700">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <form onSubmit={applyFilters} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <Filter size={14} className="text-gray-400 mt-3" />
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Search</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter rows…" className={inputCls + ' w-full'} />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">Apply</button>
          {(filters.from || filters.to || filters.q) && (
            <button type="button" onClick={clearFilters} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Clear</button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={16} className="text-studio-600" />
            <div>
              <p className="text-sm text-gray-500">{rows.length} row{rows.length === 1 ? '' : 's'}</p>
              {result?.notes && <p className="text-xs text-gray-400 mt-0.5">{result.notes}</p>}
            </div>
          </div>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No data for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {columns.map(c => (
                    <th key={c.key} className={cn(
                      'px-5 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap',
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    )}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map(c => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-5 py-2.5 text-sm text-gray-700',
                          c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                          c.format === 'currency' || c.format === 'number' ? 'tabular-nums' : '',
                        )}
                      >
                        {formatCell(r[c.key], c.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
