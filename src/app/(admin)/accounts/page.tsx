import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import AccountsDashboard from '@/components/admin/AccountsDashboard'
import { getAgeFromDob } from '@/lib/utils'

export default async function AccountsPage() {
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: families }, { data: students }, { data: openInvoices }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, active, created_at, guardian_students(student_id)')
      .eq('role', 'parent')
      .order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, date_of_birth, active, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('amount, guardian_id, guardian:profiles(first_name, last_name)')
      .in('status', ['pending', 'failed']),
  ])

  const familyList = families ?? []
  const studentList = students ?? []
  const invoiceList = (openInvoices ?? []) as any[]

  const stats = {
    totalFamilies: familyList.length,
    activeFamilies: familyList.filter(f => f.active).length,
    newFamilies: familyList.filter(f => f.created_at && f.created_at >= monthStart).length,
    totalStudents: studentList.length,
    activeStudents: studentList.filter(s => s.active).length,
    newStudents: studentList.filter(s => s.created_at && s.created_at >= monthStart).length,
    outstandingTotal: invoiceList.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    outstandingCount: invoiceList.length,
  }

  const recentFamilies = familyList.slice(0, 6).map(f => ({
    id: f.id,
    name: `${f.first_name} ${f.last_name}`,
    email: f.email,
    student_count: Array.isArray(f.guardian_students) ? f.guardian_students.length : 0,
    created_at: f.created_at,
  }))

  const recentStudents = studentList.slice(0, 6).map(s => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    age: s.date_of_birth ? getAgeFromDob(s.date_of_birth) : null,
    created_at: s.created_at,
  }))

  // Upcoming dancer birthdays (next 30 days)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const birthdays = studentList
    .filter(s => s.date_of_birth && s.active)
    .map(s => {
      const b = new Date(s.date_of_birth + 'T00:00:00')
      let next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
      if (next < startOfDay) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate())
      const daysUntil = Math.round((next.getTime() - startOfDay.getTime()) / 86_400_000)
      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        date: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        turningAge: next.getFullYear() - b.getFullYear(),
        daysUntil,
      }
    })
    .filter(b => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // Families with an outstanding balance
  const byFamily = new Map<string, { id: string; name: string; amount: number; count: number }>()
  for (const inv of invoiceList) {
    if (!inv.guardian_id) continue
    const existing = byFamily.get(inv.guardian_id)
    const name = inv.guardian ? `${inv.guardian.first_name} ${inv.guardian.last_name}` : 'Unknown'
    if (existing) {
      existing.amount += Number(inv.amount || 0)
      existing.count += 1
    } else {
      byFamily.set(inv.guardian_id, { id: inv.guardian_id, name, amount: Number(inv.amount || 0), count: 1 })
    }
  }
  const outstandingFamilies = [...byFamily.values()].sort((a, b) => b.amount - a.amount).slice(0, 8)

  return (
    <div className="flex flex-col h-full">
      <Header title="Accounts" subtitle="Families and students overview" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>People</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                Where your families and students stand right now.
              </p>
            </div>
        <AccountsDashboard
          stats={stats}
          recentFamilies={recentFamilies}
          recentStudents={recentStudents}
          birthdays={birthdays}
          outstandingFamilies={outstandingFamilies}
        />
          </div>
        </div>
      </div>
    </div>
  )
}
