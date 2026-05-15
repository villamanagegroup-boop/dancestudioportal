import { getPortalViewer } from '@/lib/portal-viewer'
import { formatCurrency, formatDate } from '@/lib/utils'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentBillingPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: invoices } = await db
    .from('invoices')
    .select('*')
    .eq('guardian_id', gid)
    .order('created_at', { ascending: false })

  const list = invoices ?? []
  const outstanding = list.filter(i => i.status === 'pending' || i.status === 'failed')
  const paid = list.filter(i => i.status === 'paid')
  const outstandingTotal = outstanding.reduce((s, i) => s + Number(i.amount), 0)
  const paidTotal = paid.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Billing</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Your account.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {outstanding.length > 0
            ? `You have ${formatCurrency(outstandingTotal)} outstanding across ${outstanding.length} invoice${outstanding.length === 1 ? '' : 's'}.`
            : 'You’re all caught up.'}
        </p>
      </div>

      <KpiStrip
        items={[
          { label: 'Outstanding', value: formatCurrency(outstandingTotal) },
          { label: 'Open invoices', value: String(outstanding.length) },
          { label: 'Lifetime paid', value: formatCurrency(paidTotal) },
        ]}
      />

      {outstanding.length > 0 && (
        <>
          <hr className="section-rule" />
          <section>
            <SectionHead label="Outstanding" />
            <div className="tight-list">
              {outstanding.map(inv => (
                <div key={inv.id} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{inv.description}</div>
                    <div className="s">
                      {inv.due_date ? `Due ${formatDate(inv.due_date)}` : 'No due date'} ·{' '}
                      <span style={{ color: inv.status === 'failed' ? '#dc2626' : '#b45309', fontWeight: 600 }}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                  <div className="tl-trail">
                    <span style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{formatCurrency(Number(inv.amount))}</span>
                    <button className="text-sm font-medium" style={{ color: 'var(--grad-1)' }}>
                      Pay →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <hr className="section-rule" />

      <section>
        <SectionHead label="Payment history" />
        {paid.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No payment history yet.</p>
        ) : (
          <div className="tight-list">
            {paid.map(inv => (
              <div key={inv.id} className="tl-row no-lead">
                <div className="tl-main">
                  <div className="t">{inv.description}</div>
                  <div className="s">{inv.paid_at ? `Paid ${formatDate(inv.paid_at)}` : '—'}</div>
                </div>
                <div className="tl-trail">
                  <span className="tag tag-mint">{inv.status}</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{formatCurrency(Number(inv.amount))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
