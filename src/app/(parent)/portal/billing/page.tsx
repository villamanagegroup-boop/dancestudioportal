import { getPortalViewer } from '@/lib/portal-viewer'
import { formatCurrency, formatDate, cn, getPaymentStatusColor } from '@/lib/utils'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentBillingPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: invoices } = await db
    .from('invoices').select('*')
    .eq('guardian_id', gid)
    .order('created_at', { ascending: false })

  const outstanding = (invoices ?? []).filter(i => i.status === 'pending' || i.status === 'failed')
  const paid = (invoices ?? []).filter(i => i.status === 'paid')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Outstanding */}
      {outstanding.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Outstanding</h2>
          <div className="space-y-3">
            {outstanding.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl border border-orange-200 shadow-sm p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{inv.description}</p>
                  <p className="text-sm text-gray-500">
                    {inv.due_date ? `Due ${formatDate(inv.due_date)}` : 'No due date'} ·{' '}
                    <span className={cn('text-xs font-medium', getPaymentStatusColor(inv.status).split(' ')[1])}>
                      {inv.status}
                    </span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-lg">{formatCurrency(Number(inv.amount))}</p>
                  <button className="text-sm font-medium text-studio-600 hover:text-studio-700 mt-1">
                    Pay Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment history */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment History</h2>
        {paid.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No payment history yet
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paid On</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paid.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-5 py-3 text-sm text-gray-900">{inv.description}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.amount))}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getPaymentStatusColor(inv.status))}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
