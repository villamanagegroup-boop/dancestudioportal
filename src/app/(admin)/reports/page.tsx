import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import ReportsView from '@/components/admin/ReportsView'

export default async function ReportsPage() {
  const supabase = createAdminClient()

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: paidAllTime },
    { data: paidThisMonth },
    { data: paidThisYear },
    { data: enrollmentsByStatus },
    { data: topClasses },
    { count: totalStudents },
    { count: activeStudents },
  ] = await Promise.all([
    supabase.from('invoices').select('amount').eq('status', 'paid'),
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', yearStart),
    supabase.from('enrollments').select('status'),
    supabase.from('enrollments')
      .select('class:classes(id, name), count:id')
      .eq('status', 'active'),
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
        />
      </div>
    </div>
  )
}
