import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
import { formatCurrency } from '@/lib/utils'

interface Props {
  revenueAllTime: number
  revenueThisMonth: number
  revenueThisYear: number
  totalStudents: number
  activeStudents: number
  enrollmentsByStatus: { status: string; count: number }[]
  topClasses: { name: string; count: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
  revenueByType: { type: string; amount: number }[]
  outstanding: number
  overdue: number
}

const STATUS_COLORS: Record<string, string> = {
  active: '#8b5cf6',
  waitlisted: '#f59e0b',
  pending: '#22d3ee',
  dropped: '#fb7185',
  completed: '#2dd4bf',
}

const TYPE_COLORS = ['#7c5cff', '#22d3ee', '#22c5b8', '#f59e0b', '#fb7185', '#9ca3af']

function HBar({ label, value, total, color, format = 'number' }: {
  label: string; value: number; total: number; color: string; format?: 'number' | 'currency'
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium capitalize" style={{ color: 'var(--ink-2)' }}>{label}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-1)' }}>
          {format === 'currency' ? formatCurrency(value) : value.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}

export default function ReportsView({
  revenueAllTime, revenueThisMonth, revenueThisYear,
  totalStudents, activeStudents,
  enrollmentsByStatus, topClasses,
  monthlyRevenue, revenueByType, outstanding, overdue,
}: Props) {
  const totalEnrollments = enrollmentsByStatus.reduce((s, e) => s + e.count, 0)
  const maxClassCount = Math.max(...topClasses.map(c => c.count), 1)
  const typeTotal = revenueByType.reduce((s, t) => s + t.amount, 0)
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.revenue), 1)
  const sixMonthTotal = monthlyRevenue.reduce((s, m) => s + m.revenue, 0)

  return (
    <div>
      <KpiStrip items={[
        { label: 'Revenue this month', value: formatCurrency(revenueThisMonth) },
        { label: 'Revenue this year', value: formatCurrency(revenueThisYear) },
        { label: 'All-time revenue', value: formatCurrency(revenueAllTime) },
        { label: 'Students', value: `${activeStudents} / ${totalStudents}`, sub: 'active / total' },
      ]} />

      <div className="mt-6">
        <KpiStrip items={[
          { label: 'Outstanding receivables', value: formatCurrency(outstanding), sub: 'all pending invoices' },
          { label: 'Overdue', value: formatCurrency(overdue), sub: 'past their due date' },
        ]} />
      </div>

      <hr className="section-rule" />

      <section>
        <SectionHead label="Revenue · last 6 months" />
        <div className="flex items-end justify-between gap-8 flex-wrap mb-4">
          <div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
              {formatCurrency(sixMonthTotal)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Collected · {formatCurrency(revenueThisMonth)} this month
            </div>
          </div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {monthlyRevenue[0]?.month} – {monthlyRevenue[monthlyRevenue.length - 1]?.month}
          </div>
        </div>
        {sixMonthTotal === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No revenue recorded in the last 6 months.</p>
        ) : (
          <div className="spark-bars">
            {monthlyRevenue.map((b, i) => {
              const h = Math.max(4, (b.revenue / maxMonthly) * 100)
              const isCurrent = i === monthlyRevenue.length - 1
              return (
                <div key={i} className={`col ${isCurrent ? 'current' : ''}`}>
                  <div className="bar" style={{ height: `${h}%` }} title={`${b.month}: ${formatCurrency(b.revenue)}`} />
                  <div className="label">{b.month}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <hr className="section-rule" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div>
          <SectionHead label="Revenue by type · this year" />
          {revenueByType.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No paid invoices this year.</p>
          ) : (
            <div className="space-y-3">
              {revenueByType.map((t, i) => (
                <HBar
                  key={t.type}
                  label={t.type}
                  value={t.amount}
                  total={typeTotal}
                  color={TYPE_COLORS[i % TYPE_COLORS.length]}
                  format="currency"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHead label="Enrollment breakdown" right={<span className="text-xs tabular-nums" style={{ color: 'var(--ink-3)' }}>{totalEnrollments} total</span>} />
          {totalEnrollments === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No enrollment data yet.</p>
          ) : (
            <div className="space-y-3">
              {enrollmentsByStatus.map(s => (
                <HBar
                  key={s.status}
                  label={s.status}
                  value={s.count}
                  total={totalEnrollments}
                  color={STATUS_COLORS[s.status] ?? '#9ca3af'}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="section-rule" />

      <section>
        <SectionHead label="Top classes by enrollment" />
        {topClasses.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No enrollment data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
            {topClasses.map((c, i) => (
              <HBar
                key={c.name}
                label={c.name}
                value={c.count}
                total={maxClassCount}
                color={TYPE_COLORS[i % TYPE_COLORS.length]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
