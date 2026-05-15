import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: paidThisMonth }, { data: openInvoices }, { data: instructors }] = await Promise.all([
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
    supabase.from('invoices').select('amount, due_date').in('status', ['pending', 'failed']),
    supabase.from('instructors').select('id, active, background_check_expires'),
  ])

  const open = openInvoices ?? []
  const staff = instructors ?? []

  function bgDays(d: string | null) {
    if (!d) return null
    return Math.round((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  }

  const stats = {
    revenueThisMonth: (paidThisMonth ?? []).reduce((s, i) => s + Number(i.amount || 0), 0),
    outstanding: open.reduce((s, i) => s + Number(i.amount || 0), 0),
    openInvoices: open.length,
    overdueInvoices: open.filter(i => i.due_date && new Date(i.due_date) < now).length,
    activeStaff: staff.filter(s => s.active).length,
    totalStaff: staff.length,
    bgExpiring: staff.filter(s => {
      const d = bgDays(s.background_check_expires)
      return d !== null && d >= 0 && d <= 60
    }).length,
    bgExpired: staff.filter(s => {
      const d = bgDays(s.background_check_expires)
      return d !== null && d < 0
    }).length,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin" subtitle="Billing, reporting, and staff management" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Operations</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                Billing, reporting, and your team&apos;s status.
              </p>
            </div>
            <AdminDashboard stats={stats} />
          </div>
        </div>
      </div>
    </div>
  )
}
