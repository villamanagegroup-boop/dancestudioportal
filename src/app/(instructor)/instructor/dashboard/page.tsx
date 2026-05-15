import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime, formatCurrency, formatDate } from '@/lib/utils'
import Header from '@/components/admin/Header'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Hello'
}

function bgStatus(expires: string | null) {
  if (!expires) return { label: 'Not on file', tone: 'gray' as const }
  const days = Math.round((new Date(expires + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: 'Expired', tone: 'danger' as const }
  if (days <= 60) return { label: `Expires in ${days}d`, tone: 'warn' as const }
  return { label: 'Current', tone: 'good' as const }
}

export default async function InstructorDashboardPage() {
  const { db, effectiveId } = await getPortalViewer('i')
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDay = days[today.getDay()]

  if (!effectiveId) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="page-gutter min-h-full">
            <div className="glass glass-page min-h-full">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Instructor Portal</p>
              <h1 className="h1 mt-2" style={{ fontSize: 26 }}>Sign in to continue.</h1>
              <p className="mt-2 muted">Your dashboard will appear here once your account is linked.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [
    { data: instructor },
    { data: classes },
    { data: enrollments },
    { data: hours },
    { data: messages },
  ] = await Promise.all([
    db.from('instructors').select('first_name, pay_rate, pay_type, background_check_expires').eq('id', effectiveId).maybeSingle(),
    db.from('classes').select(`
      id, name, day_of_week, start_time, end_time, max_students,
      class_type:class_types(color),
      enrollments:enrollments(id, status)
    `).eq('instructor_id', effectiveId).eq('active', true),
    db.from('enrollments').select('student_id, status, class:classes!inner(instructor_id)').eq('class.instructor_id', effectiveId).eq('status', 'active'),
    db.from('instructor_hours').select('hours, worked_on').eq('instructor_id', effectiveId).gte('worked_on', monthStart),
    db.from('communications')
      .select('id, subject, body, sent_at, comm_type, target_type')
      .or(`target_instructor_id.eq.${effectiveId},target_type.in.(all_staff,everyone)`)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(4),
  ])

  const firstName = instructor?.first_name ?? 'there'
  const classList = (classes ?? []) as any[]
  const todays = classList
    .filter(c => c.day_of_week === todayDay)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))

  const uniqueStudents = new Set((enrollments ?? []).map((e: any) => e.student_id)).size
  const hoursThisMonth = (hours ?? []).reduce((s, h) => s + Number(h.hours), 0)
  const payThisMonth =
    instructor?.pay_type === 'hourly' && instructor?.pay_rate != null
      ? hoursThisMonth * Number(instructor.pay_rate)
      : 0

  const bg = bgStatus(instructor?.background_check_expires ?? null)

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full flex flex-col">
          {/* Personal greeting — sits on the gradient, above the card */}
          <div className="mb-8">
            <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>{greetingFor(today.getHours())}</p>
            <h1 className="h1 mt-2" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
              Hi, <span className="grad-text">{firstName}</span>.
            </h1>
          </div>

          <div className="glass glass-page flex-1">
            {/* Insights tagline */}
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Insights · {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                {todays.length === 0
                  ? `No classes on your schedule today.`
                  : `You have ${todays.length} class${todays.length === 1 ? '' : 'es'} on your schedule today.`}
              </p>
            </div>

            <KpiStrip
        items={[
          { label: 'Classes', value: String(classList.length) },
          { label: 'Students taught', value: String(uniqueStudents) },
          { label: 'Hours this month', value: hoursThisMonth.toFixed(1) },
          {
            label: 'Pay this month',
            value: instructor?.pay_type === 'hourly' ? formatCurrency(payThisMonth) : '—',
            sub: instructor?.pay_type === 'hourly' ? 'hourly' : (instructor?.pay_type ?? ''),
          },
        ]}
      />

      {bg.tone !== 'good' && (
        <div className="mt-5">
          <Link
            href="/instructor/settings"
            className="attention-pill"
            style={
              bg.tone === 'danger'
                ? { background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.25)' }
                : bg.tone === 'warn'
                  ? { background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.25)' }
                  : undefined
            }
          >
            <span className="dot-sm" />
            Background check: {bg.label}
            <span style={{ marginLeft: 4, color: 'var(--ink-3)' }}>→</span>
          </Link>
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="On your schedule today" href="/instructor/my-classes" action="Full week →" />
      {todays.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nothing scheduled today.</p>
      ) : (
        <div className="tight-list">
          {todays.map((cls: any) => {
            const active = (cls.enrollments ?? []).filter((e: any) => e.status === 'active').length
            const max = cls.max_students ?? 0
            return (
              <Link key={cls.id} href={`/classes/${cls.id}`} className="tl-row">
                <div className="tl-lead">
                  <div className="t">{formatTime(cls.start_time)}</div>
                  <div className="s">{cls.end_time ? `→ ${formatTime(cls.end_time)}` : ''}</div>
                </div>
                <div className="tl-main">
                  <div className="t flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cls.class_type?.color ?? 'var(--grad-1)' }} />
                    {cls.name}
                  </div>
                  <div className="s">{max > 0 ? `${active}/${max} enrolled` : `${active} enrolled`}</div>
                </div>
                <div className="tl-trail">View →</div>
              </Link>
            )
          })}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Recent inbox" href="/instructor/inbox" action="Open inbox →" />
      {(messages ?? []).length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No messages.</p>
      ) : (
        <div className="tight-list">
          {(messages ?? []).map((m: any) => (
            <Link key={m.id} href="/instructor/inbox" className="tl-row no-lead">
              <div className="tl-main">
                <div className="t">{m.subject || '(no subject)'}</div>
                <div className="s">{m.body?.slice(0, 100)}</div>
              </div>
              <div className="tl-trail">{formatDate(m.sent_at)}</div>
            </Link>
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
