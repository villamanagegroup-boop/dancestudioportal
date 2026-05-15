import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
import { formatTime, formatCurrency } from '@/lib/utils'

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Hello'
}

export default async function DashboardPage() {
  const supabase = createAdminClient()
  const ssr = await createClient()

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDay = days[today.getDay()]
  const todayIso = today.toISOString().slice(0, 10)

  const [
    { count: totalStudents },
    { count: classesThisWeek },
    { data: paidInvoices },
    { data: outstandingInvoices },
    { data: recentEnrollments },
    { data: todaysClasses },
    { count: trialRequests },
    { count: waitlisted },
    { data: announcements },
    { data: sixMonthInvoices },
    { data: upcomingParties },
    { data: facultyTeaching },
    { data: studioProfileRow },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
    supabase.from('invoices').select('amount').in('status', ['pending', 'failed']),
    supabase
      .from('enrollments')
      .select('id, enrolled_at, status, student:students(first_name, last_name), class:classes(name)')
      .order('enrolled_at', { ascending: false })
      .limit(6),
    supabase
      .from('classes')
      .select(`
        id, name, start_time, end_time, max_students,
        instructor:instructors(first_name, last_name),
        enrollments:enrollments(id, status)
      `)
      .eq('day_of_week', todayDay)
      .eq('active', true)
      .order('start_time'),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'waitlisted'),
    supabase
      .from('communications')
      .select('id, subject, body, created_at, sender:profiles!communications_sender_id_fkey(first_name, last_name)')
      .eq('comm_type', 'announcement')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('invoices').select('amount, paid_at').eq('status', 'paid').gte('paid_at', sixMonthsAgo),
    supabase
      .from('parties')
      .select('id, contact_name, event_date, start_time, package, status, event_type, room:rooms(name)')
      .gte('event_date', todayIso)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true })
      .limit(4),
    supabase
      .from('instructors')
      .select('id, first_name, last_name, specialties')
      .eq('active', true)
      .order('last_name')
      .limit(6),
    supabase.from('studio_settings').select('value').eq('key', 'studio_profile').maybeSingle(),
    ssr.auth.getUser(),
  ])

  // Resolve a personal greeting target
  let firstName: string | null = null
  if (user) {
    const { data: profile } = await ssr.from('profiles').select('first_name').eq('id', user.id).maybeSingle()
    firstName = profile?.first_name ?? null
  }
  const studioName = (studioProfileRow?.value as any)?.name ?? 'Capital Core'
  const greetingName = firstName || studioName
  const timeGreeting = greetingFor(today.getHours())

  // Revenue by month for the inline spark
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('en-US', { month: 'short' }), revenue: 0 }
  })
  for (const inv of sixMonthInvoices ?? []) {
    if (!inv.paid_at) continue
    const d = new Date(inv.paid_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = monthBuckets.find(b => b.key === key)
    if (bucket) bucket.revenue += Number(inv.amount)
  }
  const maxRevenue = Math.max(...monthBuckets.map(b => b.revenue), 1)
  const sixMonthTotal = monthBuckets.reduce((s, b) => s + b.revenue, 0)

  const revenueThisMonth = (paidInvoices ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const outstandingTotal = (outstandingInvoices ?? []).reduce((s, i) => s + Number(i.amount), 0)

  const pendingDecisions = (trialRequests ?? 0) + (waitlisted ?? 0)

  function relDate(s: string) {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000)
    if (diff <= 0) return 'today'
    if (diff === 1) return 'yesterday'
    if (diff < 30) return `${diff}d ago`
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function eventDateLabel(s: string) {
    const d = new Date(s + 'T00:00:00')
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    const diff = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
    if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full flex flex-col">
          {/* Personal greeting — sits on the gradient, above the card */}
          <div className="mb-8">
            <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>{timeGreeting}</p>
            <h1 className="h1 mt-2" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
              Hi, <span className="grad-text">{greetingName}</span>.
            </h1>
          </div>

          <div className="glass glass-page flex-1">
          {/* Insights tagline */}
          <div className="mb-7">
            <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Insights · {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
              Here&apos;s today&apos;s pulse — what&apos;s happening across the studio.
            </p>
          </div>

          {/* Optional attention pill */}
          {pendingDecisions > 0 && (
            <Link href="/enrollments" className="attention-pill mb-6">
              <span className="dot-sm" />
              {pendingDecisions} dancer{pendingDecisions === 1 ? '' : 's'} waiting on a decision
              <span style={{ marginLeft: 4, color: 'var(--ink-3)' }}>→</span>
            </Link>
          )}

          {/* KPI strip */}
          <KpiStrip items={[
            { label: 'Active dancers', value: String(totalStudents ?? 0) },
            { label: 'Active classes', value: String(classesThisWeek ?? 0) },
            { label: 'Revenue this month', value: formatCurrency(revenueThisMonth) },
            { label: 'Outstanding', value: formatCurrency(outstandingTotal) },
          ]} />

          <hr className="section-rule" />

          {/* Today on the floor */}
          <section>
            <SectionHead label="On the floor today" href="/calendar" action="Full week →" />
            {(todaysClasses ?? []).length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Nothing on the calendar today.</p>
            ) : (
              <div className="tight-list">
                {(todaysClasses ?? []).map((cls: any) => {
                  const active = (cls.enrollments ?? []).filter((e: any) => e.status === 'active').length
                  const wait = (cls.enrollments ?? []).filter((e: any) => e.status === 'waitlisted').length
                  const max = cls.max_students ?? 0
                  const full = max > 0 && active >= max
                  return (
                    <Link key={cls.id} href={`/classes/${cls.id}`} className="tl-row">
                      <div className="tl-lead">
                        <div className="t">{formatTime(cls.start_time)}</div>
                        <div className="s">{cls.end_time ? `→ ${formatTime(cls.end_time)}` : ''}</div>
                      </div>
                      <div className="tl-main">
                        <div className="t">{cls.name}</div>
                        <div className="s">
                          {cls.instructor ? `${cls.instructor.first_name} ${cls.instructor.last_name}` : 'Unassigned'}
                          {max > 0 && ` · ${active}/${max} enrolled`}
                        </div>
                      </div>
                      <div className="tl-trail">
                        {wait > 0 && <span className="tag tag-amber">Waitlist · {wait}</span>}
                        {full
                          ? <span className="tag tag-mint">Full</span>
                          : max > 0 && <span>{max - active} open</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <hr className="section-rule" />

          {/* Upcoming events + Announcements */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div>
              <SectionHead label="Upcoming events" href="/parties" action="All events →" />
              {(upcomingParties ?? []).length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Nothing on the books.</p>
              ) : (
                <div className="tight-list">
                  {(upcomingParties ?? []).map((p: any) => (
                    <Link key={p.id} href={`/parties/${p.id}`} className="tl-row">
                      <div className="tl-lead">
                        <div className="t">{eventDateLabel(p.event_date)}</div>
                        <div className="s">{p.start_time ? formatTime(p.start_time) : ''}</div>
                      </div>
                      <div className="tl-main">
                        <div className="t">{p.contact_name || 'Studio event'}</div>
                        <div className="s">{p.room?.name ?? 'Studio'} · {p.event_type ?? 'event'}</div>
                      </div>
                      <div className="tl-trail">
                        <span className="tag tag-iris">{p.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHead label="Latest announcements" href="/communications" action="Inbox →" />
              {(announcements ?? []).length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>No announcements yet.</p>
              ) : (
                <div className="tight-list">
                  {(announcements ?? []).map((a: any) => (
                    <Link key={a.id} href="/communications" className="tl-row no-lead">
                      <div className="tl-main">
                        <div className="t">{a.subject || 'Announcement'}</div>
                        <div className="s">{a.body}</div>
                      </div>
                      <div className="tl-trail">
                        <span>{relDate(a.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <hr className="section-rule" />

          {/* Recent enrollments + Faculty */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div>
              <SectionHead label="Recent enrollments" href="/enrollments" action="All →" />
              {(recentEnrollments ?? []).length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>No enrollments yet.</p>
              ) : (
                <div className="tight-list">
                  {(recentEnrollments ?? []).map((e: any) => (
                    <div key={e.id} className="tl-row no-lead">
                      <div className="tl-main">
                        <div className="t">
                          {e.student ? `${e.student.first_name} ${e.student.last_name}` : 'Unknown'}
                        </div>
                        <div className="s">{e.class?.name ?? '—'}</div>
                      </div>
                      <div className="tl-trail">
                        <span className={`tag ${e.status === 'active' ? 'tag-mint' : e.status === 'waitlisted' ? 'tag-amber' : 'tag-blue'}`}>{e.status}</span>
                        <span>{relDate(e.enrolled_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHead label="Faculty" href="/staff" action="All staff →" />
              {(facultyTeaching ?? []).length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>No instructors yet.</p>
              ) : (
                <div className="tight-list">
                  {(facultyTeaching ?? []).map((i: any) => {
                    const styles = (i.specialties ?? []).slice(0, 2).join(' · ')
                    return (
                      <Link key={i.id} href={`/staff/${i.id}`} className="tl-row no-lead">
                        <div className="tl-main">
                          <div className="t">{i.first_name} {i.last_name}</div>
                          <div className="s">{styles || 'Faculty'}</div>
                        </div>
                        <div className="tl-trail">
                          <span>View →</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <hr className="section-rule" />

          {/* Revenue spark */}
          <section>
            <SectionHead label="Revenue · last 6 months" href="/reports" action="Reports →" />
            <div className="flex items-end justify-between gap-8 flex-wrap mb-4">
              <div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
                  {formatCurrency(sixMonthTotal)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                  Collected · {formatCurrency(revenueThisMonth)} this month
                </div>
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {monthBuckets[0].month} – {monthBuckets[5].month}
              </div>
            </div>
            <div className="spark-bars">
              {monthBuckets.map((b, i) => {
                const h = Math.max(4, (b.revenue / maxRevenue) * 100)
                const isCurrent = i === monthBuckets.length - 1
                return (
                  <div key={i} className={`col ${isCurrent ? 'current' : ''}`}>
                    <div className="bar" style={{ height: `${h}%` }} title={`${b.month}: ${formatCurrency(b.revenue)}`} />
                    <div className="label">{b.month}</div>
                  </div>
                )
              })}
            </div>
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}
