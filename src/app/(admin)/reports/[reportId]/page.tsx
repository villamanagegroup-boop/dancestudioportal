import { notFound } from 'next/navigation'
import { findReport } from '@/lib/reports'
import { RUNNERS, type ReportFilters, type ReportColumn } from '@/lib/report-runners'
import Header from '@/components/admin/Header'
import ReportViewer from '@/components/admin/ReportViewer'

export default async function ReportRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>
  searchParams: Promise<{ from?: string; to?: string; q?: string }>
}) {
  const { reportId } = await params
  const sp = await searchParams

  const def = findReport(reportId)
  if (!def) notFound()

  const filters: ReportFilters = { from: sp.from, to: sp.to, q: sp.q }

  let result = null
  if (def.status === 'available' && RUNNERS[def.id]) {
    try {
      result = await RUNNERS[def.id](filters)
      if (filters.q && result) {
        const q = filters.q.toLowerCase()
        const cols = result.columns
        result = {
          ...result,
          rows: result.rows.filter(r =>
            cols.some((c: ReportColumn) => String(r[c.key] ?? '').toLowerCase().includes(q)),
          ),
        }
      }
    } catch (err: any) {
      result = { columns: [], rows: [], notes: `Error: ${err?.message ?? 'failed to run report'}` }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`${def.id} · ${def.title}`} subtitle={def.description} />
      <div className="p-6 overflow-y-auto">
        <ReportViewer def={def} filters={filters} result={result} />
      </div>
    </div>
  )
}
