import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, Calendar, CreditCard } from 'lucide-react'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('guardian_students').select('student:students(id, first_name, last_name)')
    .eq('guardian_id', user.id)

  const [{ data: invoices }] = await Promise.all([
    supabase.from('invoices').select('id, amount, status, description, due_date')
      .eq('guardian_id', user.id).in('status', ['pending', 'failed']).limit(5),
  ])

  const outstanding = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div className="space-y-6">
      <section className="hero">
        <div className="hero-eyebrow">Parent Portal</div>
        <h1 className="h1 mt-2" style={{ fontSize: 34, lineHeight: 1.05, maxWidth: '22ch' }}>
          Welcome back — <span style={{ opacity: 0.85 }}>{students?.length ?? 0} dancer{students?.length === 1 ? '' : 's'} on your account.</span>
        </h1>
        <p style={{ margin: '6px 0 0', maxWidth: '56ch', fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
          {outstanding > 0
            ? `${formatCurrency(outstanding)} outstanding across ${invoices?.length ?? 0} invoice${invoices?.length === 1 ? '' : 's'}.`
            : 'All paid up — see today’s classes or browse upcoming events.'}
        </p>
        <div className="flex gap-2.5 mt-5" style={{ flexWrap: 'wrap' }}>
          <Link href="/portal/classes" className="btn btn-primary" style={{ background: 'rgba(255,255,255,0.96)', color: 'var(--ink-1)', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
            View classes
          </Link>
          <Link href="/portal/billing" className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(8px)' }}>
            Billing →
          </Link>
        </div>
      </section>

      {/* Outstanding balance banner */}
      {outstanding > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Outstanding Balance: {formatCurrency(outstanding)}</p>
            <p className="text-xs text-orange-600">{invoices?.length} invoice{invoices?.length !== 1 ? 's' : ''} pending payment</p>
          </div>
          <Link href="/portal/billing" className="text-sm font-medium text-orange-700 hover:text-orange-800 underline">
            Pay Now
          </Link>
        </div>
      )}

      {/* Students */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Students</h2>
        {!students?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No students linked to your account. Contact the studio.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {students.map((gs: any) => gs.student && (
              <div key={gs.student.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold mb-2">
                  {gs.student.first_name[0]}{gs.student.last_name[0]}
                </div>
                <p className="font-medium text-gray-900 text-sm">{gs.student.first_name} {gs.student.last_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/portal/classes">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-studio-50 flex items-center justify-center">
              <Calendar size={20} className="text-studio-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Classes</p>
              <p className="text-sm text-gray-500">View schedules &amp; enroll</p>
            </div>
          </div>
        </Link>
        <Link href="/portal/billing">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CreditCard size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Billing</p>
              <p className="text-sm text-gray-500">Invoices &amp; payments</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
