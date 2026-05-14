'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthSlice {
  month: string
  revenue: number
}

interface Props {
  data: MonthSlice[]
}

// Gradient stops drawn from the design palette (teal → cyan → purple ramp)
const COLORS = ['#67e8f9', '#22d3ee', '#06b6d4', '#22c5b8', '#7c5cff', '#8b5cf6']

export default function RevenueChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const hasData = total > 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>Revenue — Last 6 Months</h2>
      {hasData ? (
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="#fff"
                  dataKey="revenue"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--line)', fontSize: '12px', background: 'var(--glass-thin)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Total</p>
              <p className="text-base font-bold" style={{ color: 'var(--ink-1)' }}>{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {data.map((d, i) => (
              <div key={d.month} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{d.month}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{formatCurrency(d.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          No revenue recorded in the last 6 months.
        </div>
      )}
    </div>
  )
}
