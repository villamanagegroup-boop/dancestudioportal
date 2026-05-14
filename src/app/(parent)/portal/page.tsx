import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertCircle, Calendar, CreditCard } from 'lucide-react'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function PortalPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: students } = await db
    .from('guardian_students').select('student:students(id, first_name, last_name)')
    .eq('guardian_id', gid)

  const studentIds = (students ?? []).map((gs: any) => gs.student?.id).filter(Boolean)

  // Class ids the family is enrolled in — drives which announcements they see
  const { data: enr } = studentIds.length
    ? await db.from('enrollments').select('class_id').in('student_id', studentIds)
    : { data: [] as any[] }
  const classIds = [...new Set((enr ?? []).map((e: any) => e.class_id).filter(Boolean))]

  let annQuery = db.from('communications')
    .select('id, subject, sent_at, created_at, target_all, class:classes(name)')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(3)
  annQuery = classIds.length
    ? annQuery.or(`target_all.eq.true,target_class_id.in.(${classIds.join(',')})`)
    : annQuery.eq('target_all', true)

  const [{ data: invoices }, { data: announcements }] = await Promise.all([
    db.from('invoices').select('id, amount, status, description, due_date')
      .eq('guardian_id', gid).in('status', ['pending', 'failed']).limit(5),
    annQuery,
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
              <Link
                key={gs.student.id}
                href={`/portal/dancers/${gs.student.id}`}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold mb-2">
                  {gs.student.first_name[0]}{gs.student.last_name[0]}
                </div>
                <p className="font-medium text-gray-900 text-sm">{gs.student.first_name} {gs.student.last_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">View profile →</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Latest news */}
      {(announcements?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Latest News</h2>
            <Link href="/portal/announcements" className="text-sm font-medium text-studio-600 hover:text-studio-700">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(announcements ?? []).map((a: any) => (
              <Link
                key={a.id}
                href="/portal/announcements"
                className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-studio-50 text-studio-700">
                    {a.target_all ? 'Studio-wide' : a.class?.name ?? 'Class'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{a.subject ?? '(no subject)'}</span>
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(a.sent_at ?? a.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
