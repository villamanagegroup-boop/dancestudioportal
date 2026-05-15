import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { formatCurrency } from '@/lib/utils'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'

const NO_ID = '00000000-0000-0000-0000-000000000000'

function relDate(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function PortalPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: profile } = await db
    .from('profiles')
    .select('first_name')
    .eq('id', gid)
    .maybeSingle()
  const firstName = profile?.first_name ?? 'there'

  const { data: students } = await db
    .from('guardian_students')
    .select('student:students(id, first_name, last_name)')
    .eq('guardian_id', gid)
  const studentList = (students ?? []).map((gs: any) => gs.student).filter(Boolean)
  const studentIds = studentList.map((s: any) => s.id)

  const { data: enr } = studentIds.length
    ? await db.from('enrollments').select('class_id, status').in('student_id', studentIds)
    : { data: [] as any[] }
  const activeEnrollments = (enr ?? []).filter((e: any) => e.status === 'active').length
  const classIds = [...new Set((enr ?? []).map((e: any) => e.class_id).filter(Boolean))]

  let annQuery = db
    .from('communications')
    .select('id, subject, sent_at, created_at, target_all, class:classes(name)')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(4)
  annQuery = classIds.length
    ? annQuery.or(`target_all.eq.true,target_class_id.in.(${classIds.join(',')})`)
    : annQuery.eq('target_all', true)

  const [{ data: invoices }, { data: announcements }] = await Promise.all([
    db
      .from('invoices')
      .select('id, amount, status, description, due_date')
      .eq('guardian_id', gid)
      .in('status', ['pending', 'failed'])
      .limit(5),
    annQuery,
  ])

  const outstanding = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div>
      {/* Greeting */}
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>My Portal</p>
        <h1 className="h1 mt-2" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
          Hi, <span className="grad-text">{firstName}</span>.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>
          {outstanding > 0
            ? `You have ${formatCurrency(outstanding)} outstanding across ${invoices?.length} invoice${invoices?.length === 1 ? '' : 's'}.`
            : 'You’re all caught up. Browse classes or check the latest news below.'}
        </p>
      </div>

      <KpiStrip
        items={[
          { label: 'Dancers', value: String(studentList.length) },
          { label: 'Active enrollments', value: String(activeEnrollments) },
          { label: 'Outstanding', value: formatCurrency(outstanding) },
          { label: 'Open invoices', value: String(invoices?.length ?? 0) },
        ]}
      />

      {outstanding > 0 && (
        <div className="mt-5">
          <Link href="/portal/billing" className="attention-pill">
            <span className="dot-sm" />
            Pay {formatCurrency(outstanding)} now
            <span style={{ marginLeft: 4, color: 'var(--ink-3)' }}>→</span>
          </Link>
        </div>
      )}

      <hr className="section-rule" />

      <section>
        <SectionHead label="Your dancers" />
        {studentList.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            No dancers linked to your account. Contact the studio.
          </p>
        ) : (
          <div className="tight-list">
            {studentList.map((s: any) => (
              <Link key={s.id} href={`/portal/dancers/${s.id}`} className="tl-row no-lead">
                <div className="tl-main">
                  <div className="t">{s.first_name} {s.last_name}</div>
                  <div className="s">View profile, attendance, and documents</div>
                </div>
                <div className="tl-trail">→</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <hr className="section-rule" />

      <section>
        <SectionHead label="Latest news" href="/portal/announcements" action="All news →" />
        {(announcements ?? []).length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No announcements right now.</p>
        ) : (
          <div className="tight-list">
            {(announcements ?? []).map((a: any) => (
              <Link key={a.id} href="/portal/announcements" className="tl-row no-lead">
                <div className="tl-main">
                  <div className="t">{a.subject ?? 'Announcement'}</div>
                  <div className="s">{a.target_all ? 'Studio-wide' : a.class?.name ?? 'Class update'}</div>
                </div>
                <div className="tl-trail">{relDate(a.sent_at ?? a.created_at)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <hr className="section-rule" />

      <section>
        <SectionHead label="Quick links" />
        <div className="tight-list">
          <Link href="/portal/classes" className="tl-row no-lead">
            <div className="tl-main">
              <div className="t">Classes</div>
              <div className="s">View schedules and enroll</div>
            </div>
            <div className="tl-trail">→</div>
          </Link>
          <Link href="/portal/camps" className="tl-row no-lead">
            <div className="tl-main">
              <div className="t">Camps</div>
              <div className="s">Browse camps and intensives</div>
            </div>
            <div className="tl-trail">→</div>
          </Link>
          <Link href="/portal/billing" className="tl-row no-lead">
            <div className="tl-main">
              <div className="t">Billing</div>
              <div className="s">Invoices and payment history</div>
            </div>
            <div className="tl-trail">→</div>
          </Link>
          <Link href="/portal/documents" className="tl-row no-lead">
            <div className="tl-main">
              <div className="t">Documents</div>
              <div className="s">Forms, waivers, and uploads</div>
            </div>
            <div className="tl-trail">→</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
