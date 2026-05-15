import Link from 'next/link'
import { CreditCard, BarChart2, UserCheck, ArrowRight, DollarSign, AlertTriangle, ShieldAlert } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  revenueThisMonth: number
  outstanding: number
  openInvoices: number
  overdueInvoices: number
  activeStaff: number
  totalStaff: number
  bgExpiring: number
  bgExpired: number
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-studio-600" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, description }: {
  href: string; icon: React.ElementType; label: string; description: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-center gap-4"
    >
      <span className="w-11 h-11 rounded-xl bg-studio-50 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-studio-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 shrink-0" />
    </Link>
  )
}

export default function AdminDashboard({ stats }: { stats: Stats }) {
  const attention: { label: string; href: string; tone: 'warn' | 'danger' }[] = []
  if (stats.overdueInvoices > 0) {
    attention.push({
      label: `${stats.overdueInvoices} overdue invoice${stats.overdueInvoices === 1 ? '' : 's'} need follow-up`,
      href: '/billing',
      tone: 'danger',
    })
  }
  if (stats.bgExpired > 0) {
    attention.push({
      label: `${stats.bgExpired} staff background check${stats.bgExpired === 1 ? '' : 's'} expired`,
      href: '/staff',
      tone: 'danger',
    })
  }
  if (stats.bgExpiring > 0) {
    attention.push({
      label: `${stats.bgExpiring} staff background check${stats.bgExpiring === 1 ? '' : 's'} expiring within 60 days`,
      href: '/staff',
      tone: 'warn',
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Revenue This Month" value={formatCurrency(stats.revenueThisMonth)} />
        <StatCard icon={CreditCard} label="Outstanding" value={formatCurrency(stats.outstanding)} sub={`${stats.openInvoices} open invoice${stats.openInvoices === 1 ? '' : 's'}`} />
        <StatCard icon={AlertTriangle} label="Overdue Invoices" value={String(stats.overdueInvoices)} />
        <StatCard icon={UserCheck} label="Active Staff" value={String(stats.activeStaff)} sub={`${stats.totalStaff} total`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/billing" icon={CreditCard} label="Billing" description="Invoices & payments" />
        <QuickLink href="/reports" icon={BarChart2} label="Reports" description="Revenue & enrollment analytics" />
        <QuickLink href="/staff" icon={UserCheck} label="Staff" description="Instructors & background checks" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Needs Attention</h2>
        </div>
        {attention.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">All clear — nothing needs attention right now.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {attention.map((a, i) => (
              <Link key={i} href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <span className={a.tone === 'danger' ? 'text-red-500' : 'text-amber-500'}>
                  {a.tone === 'danger' ? <AlertTriangle size={16} /> : <ShieldAlert size={16} />}
                </span>
                <p className="text-sm text-gray-700 flex-1">{a.label}</p>
                <ArrowRight size={14} className="text-gray-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
