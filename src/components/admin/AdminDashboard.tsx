import Link from 'next/link'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
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
    <div>
      <KpiStrip items={[
        { label: 'Revenue this month', value: formatCurrency(stats.revenueThisMonth) },
        { label: 'Outstanding', value: formatCurrency(stats.outstanding), sub: `${stats.openInvoices} open invoice${stats.openInvoices === 1 ? '' : 's'}` },
        { label: 'Overdue invoices', value: String(stats.overdueInvoices) },
        { label: 'Active staff', value: String(stats.activeStaff), sub: `${stats.totalStaff} total` },
      ]} />

      <hr className="section-rule" />

      <section>
        <SectionHead label="Needs attention" />
        {attention.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>All clear — nothing needs attention right now.</p>
        ) : (
          <div className="tight-list">
            {attention.map((a, i) => (
              <Link key={i} href={a.href} className="tl-row no-lead">
                <div className="tl-main">
                  <div className="t" style={{ color: a.tone === 'danger' ? '#dc2626' : '#b45309' }}>
                    {a.label}
                  </div>
                </div>
                <div className="tl-trail">→</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
