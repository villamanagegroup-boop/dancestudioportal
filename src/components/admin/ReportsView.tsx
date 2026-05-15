'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Users, TrendingUp, Award, Clock, AlertTriangle } from 'lucide-react'
import RevenueChart from '@/components/admin/RevenueChart'

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

export default function ReportsView({
  revenueAllTime, revenueThisMonth, revenueThisYear,
  totalStudents, activeStudents,
  enrollmentsByStatus, topClasses,
  monthlyRevenue, revenueByType, outstanding, overdue,
}: Props) {
  const totalEnrollments = enrollmentsByStatus.reduce((s, e) => s + e.count, 0)
  const pieData = enrollmentsByStatus.filter(e => e.count > 0)
  const maxClassCount = Math.max(...topClasses.map(c => c.count), 1)
  const typeTotal = revenueByType.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenue This Month', value: formatCurrency(revenueThisMonth), icon: DollarSign, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
          { label: 'Revenue This Year', value: formatCurrency(revenueThisYear), icon: TrendingUp, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
          { label: 'All-Time Revenue', value: formatCurrency(revenueAllTime), icon: Award, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
          { label: 'Active / Total Students', value: `${activeStudents} / ${totalStudents}`, icon: Users, color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Accounts receivable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-yellow-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Outstanding Receivables</p>
            <div className="w-9 h-9 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">Total of all pending invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Overdue</p>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(overdue)}</p>
          <p className="text-xs text-gray-400 mt-1">Pending invoices past their due date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend */}
        <RevenueChart data={monthlyRevenue} />

        {/* Revenue by type */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by Type — This Year</h2>
          {revenueByType.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No paid invoices this year</div>
          ) : (
            <div className="space-y-3">
              {revenueByType.map(({ type, amount }, i) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      <span className="text-xs font-medium text-gray-700 capitalize">{type}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${typeTotal ? (amount / typeTotal) * 100 : 0}%`, backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment breakdown donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Enrollment Breakdown</h2>
          {totalEnrollments === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No enrollment data yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={70}
                      strokeWidth={2}
                      stroke="#fff"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} contentStyle={{ borderRadius: '12px', border: '1px solid var(--line)', fontSize: '12px', background: 'var(--glass-thin)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-lg font-bold text-gray-900">{totalEnrollments}</p>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {enrollmentsByStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[status] ?? '#9ca3af' }} />
                      <span className="text-xs text-gray-500 capitalize">{status}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top classes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top Classes by Enrollment</h2>
          {topClasses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No enrollment data yet</div>
          ) : (
            <div className="space-y-3">
              {topClasses.map(({ name, count }) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">{name}</span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{count}</span>
                  </div>
                  <div className="progress">
                    <div className="fill" style={{ width: `${(count / maxClassCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
