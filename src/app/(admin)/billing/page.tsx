import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import BillingDashboard from '@/components/admin/BillingDashboard'

export default async function BillingPage() {
  const supabase = createAdminClient()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [{ data: invoices }, { data: guardians }, { data: students }] = await Promise.all([
    supabase.from('invoices').select(`
      *, guardian:profiles(first_name, last_name, email),
      student:students(first_name, last_name)
    `).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, first_name, last_name').eq('role', 'parent').order('last_name'),
    supabase.from('students').select('id, first_name, last_name').order('last_name'),
  ])

  const allInvoices = invoices ?? []
  const collectedThisMonth = allInvoices
    .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= monthStart)
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const outstanding = allInvoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const overdue = allInvoices
    .filter(i => i.status === 'pending' && i.due_date && new Date(i.due_date) < today)
    .reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Billing" subtitle="Invoices and payment management" />
      <div className="p-6 overflow-y-auto">
        <BillingDashboard
          invoices={allInvoices}
          guardians={guardians ?? []}
          students={students ?? []}
          collectedThisMonth={collectedThisMonth}
          outstanding={outstanding}
          overdue={overdue}
        />
      </div>
    </div>
  )
}
