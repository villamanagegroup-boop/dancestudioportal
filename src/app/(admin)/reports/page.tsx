import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import ReportsView from '@/components/admin/ReportsView'

export default async function ReportsPage() {
  const supabase = createAdminClient()

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [
    { data: paidAllTime },
    { data: paidThisMonth },
    { data: paidThisYear },
    { data: recentPaid },
    { data: openInvoices },
    { data: enrollmentsByStatus },
    { data: topClasses },
    { count: totalStudents },
    { count: activeStudents },
  ] = await Promise.all([
    supabase.from('invoices').select('amount').eq('status', 'paid'),
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
    supabase.from('invoices').select('amount, invoice_type').eq('status', 'paid').gte('paid_at', yearStart),
    supabase.from('invoices').select('amount, paid_at').eq('status', 'paid').gte('paid_at', sixMonthsAgo),
    supabase.from('invoices').select('amount, due_date').eq('status', 'pending'),
    supabase.from('enrollments').select('status'),
    supabase.from('enrollments').select('class:classes(id, name), count:id').eq('status', 'active'),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true),
  ])

  const sum = (arr: { amount: number }[] | null) =>
    (arr ?? []).reduce((s, r) => s + Number(r.amount), 0)

  const statusCounts = ['active', 'waitlisted', 'pending', 'dropped', 'completed'].map(status => ({
    status,
    count: (enrollmentsByStatus ?? []).filter(e => e.status === status).length,
  }))

  const classCounts = Object.values(
    ((topClasses ?? []) as any[]).reduce((acc, e) => {
      const cls = e.class
      if (!cls) return acc
      if (!acc[cls.id]) acc[cls.id] = { name: cls.name, count: 0 }
      acc[cls.id].count++
      return acc
    }, {} as Record<string, { name: string; count: number }>)
  ).sort((a: any, b: any) => b.count - a.count).slice(0, 8) as { name: string; count: number }[]

  // Last 6 months revenue trend
  const monthlyRevenue: { month: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyRevenue.push({ month: d.toLocaleString('en-US', { month: 'short' }), revenue: 0 })
  }
  for (const inv of recentPaid ?? []) {
    if (!inv.paid_at) continue
    const d = new Date(inv.paid_at)
    const idx = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    const pos = 5 - idx
    if (pos >= 0 && pos < 6) monthlyRevenue[pos].revenue += Number(inv.amount)
  }

  // Revenue by invoice type (this year)
  const revenueByType = ['tuition', 'registration', 'costume', 'recital', 'retail', 'other']
    .map(type => ({
      type,
      amount: ((paidThisYear ?? []) as { amount: number; invoice_type: string }[])
        .filter(i => i.invoice_type === type)
        .reduce((s, i) => s + Number(i.amount), 0),
    }))
    .filter(t => t.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // Accounts receivable
  const outstanding = sum(openInvoices)
  const overdue = ((openInvoices ?? []) as { amount: number; due_date: string | null }[])
    .filter(i => i.due_date && new Date(i.due_date) < now)
    .reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" subtitle="Studio performance and enrollment analytics" />
      <div className="p-6 overflow-auto">
        <ReportsView
          revenueAllTime={sum(paidAllTime)}
          revenueThisMonth={sum(paidThisMonth)}
          revenueThisYear={sum(paidThisYear)}
          totalStudents={totalStudents ?? 0}
          activeStudents={activeStudents ?? 0}
          enrollmentsByStatus={statusCounts}
          topClasses={classCounts}
          monthlyRevenue={monthlyRevenue}
          revenueByType={revenueByType}
          outstanding={outstanding}
          overdue={overdue}
        />
      </div>
    </div>
  )
}
