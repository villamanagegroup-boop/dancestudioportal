import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import StatsCards from '@/components/admin/StatsCards'
import Header from '@/components/admin/Header'
import RecentEnrollments from '@/components/admin/RecentActivity'
import RevenueChart from '@/components/admin/RevenueChart'
import AnnouncementsPanel from '@/components/admin/AnnouncementsPanel'
import FacultyTeachingPanel from '@/components/admin/FacultyTeachingPanel'
import { formatTime, formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const todayDay = days[today.getDay()]

  const [
    { count: totalStudents },
    { count: classesThisWeek },
    { data: paidInvoices },
    { data: outstandingInvoices },
    { data: recentEnrollments },
    { data: todaysClasses },
    { count: trialRequests },
    { count: waitlisted },
    { count: makeupsPending },
    { data: announcements },
    { data: sixMonthInvoices },
    { data: upcomingParties },
    { data: facultyTeaching },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
    supabase.from('invoices').select('amount').in('status', ['pending', 'failed']),
    supabase.from('enrollments').select(`
      id, enrolled_at, status,
      student:students(first_name, last_name),
      class:classes(name)
    `).order('enrolled_at', { ascending: false }).limit(10),
    supabase.from('classes').select(`
      id, name, start_time, end_time, max_students,
      instructor:instructors(first_name, last_name),
      enrollments:enrollments(id, status)
    `).eq('day_of_week', todayDay).eq('active', true).order('start_time'),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'waitlisted'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('is_makeup', true).eq('present', false),
    supabase.from('communications')
      .select('id, subject, body, created_at, sender:profiles(first_name, last_name)')
      .eq('comm_type', 'announcement')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('invoices').select('amount, paid_at').eq('status', 'paid').gte('paid_at', sixMonthsAgo),
    supabase.from('parties')
      .select('id, contact_name, event_date, start_time, package, status, room:rooms(name)')
      .gte('event_date', today.toISOString().slice(0, 10))
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true })
      .limit(3),
    supabase.from('instructors')
      .select('id, first_name, last_name, bio, specialties')
      .eq('active', true)
      .order('last_name')
      .limit(4),
  ])

  const revenueByMonth = (() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('en-US', { month: 'short' }), revenue: 0 }
    })
    for (const inv of sixMonthInvoices ?? []) {
      if (!inv.paid_at) continue
      const d = new Date(inv.paid_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = buckets.find(b => b.key === key)
      if (bucket) bucket.revenue += Number(inv.amount)
    }
    return buckets.map(({ month, revenue }) => ({ month, revenue }))
  })()

  const revenueThisMonth = (paidInvoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0)
  const outstandingTotal = (outstandingInvoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
      <div className="p-6 space-y-6 overflow-y-auto">
        <section className="hero">
          <div className="hero-eyebrow">{today.toLocaleDateString('en-US', { weekday: 'long' })} · {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <h1 className="h1 mt-2" style={{ fontSize: 34, lineHeight: 1.05, maxWidth: '22ch' }}>
            Hi Studio — <span style={{ opacity: 0.85 }}>your day at a glance.</span>
          </h1>
          <p className="mt-2.5" style={{ margin: '6px 0 0', maxWidth: '56ch', fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
            {(trialRequests ?? 0) + (waitlisted ?? 0) > 0
              ? `${trialRequests ?? 0} trial request${(trialRequests ?? 0) === 1 ? '' : 's'} and ${waitlisted ?? 0} waitlisted dancer${(waitlisted ?? 0) === 1 ? '' : 's'} need a decision.`
              : 'All caught up. Tuesday in motion — keep an eye on tonight’s classes and the showcase prep block.'}
          </p>
          <div className="flex gap-2.5 mt-5" style={{ flexWrap: 'wrap' }}>
            <Link href="/calendar" className="btn btn-primary" style={{ background: 'rgba(255,255,255,0.96)', color: 'var(--ink-1)', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
              View today&apos;s schedule
            </Link>
            <Link href="/enrollments" className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(8px)' }}>
              Review enrollments →
            </Link>
          </div>
          <div className="flex gap-6 mt-5" style={{ flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{totalStudents ?? 0}</div>
              <div style={{ fontSize: 11, opacity: .85, letterSpacing: 0.04, textTransform: 'uppercase' }}>Active dancers</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{classesThisWeek ?? 0}</div>
              <div style={{ fontSize: 11, opacity: .85, letterSpacing: 0.04, textTransform: 'uppercase' }}>Active classes</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{(todaysClasses ?? []).length}</div>
              <div style={{ fontSize: 11, opacity: .85, letterSpacing: 0.04, textTransform: 'uppercase' }}>On the floor today</div>
            </div>
          </div>
        </section>

        <StatsCards
          totalStudents={totalStudents ?? 0}
          classesThisWeek={classesThisWeek ?? 0}
          revenueThisMonth={revenueThisMonth}
          outstandingTotal={outstandingTotal}
        />

        {/* Today on the floor + Studio at a glance */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="glass card">
            <div className="section-head">
              <div className="h3 flex items-center gap-2">
                <span className="dot-sm" style={{ width: 8, height: 8, background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }} />
                Today on the floor
              </div>
              <Link href="/calendar" className="btn btn-ghost btn-sm">Full week →</Link>
            </div>
            {todaysClasses && todaysClasses.length > 0 ? (
              <div className="list">
                {todaysClasses.map((cls: any, i: number) => {
                  const active = (cls.enrollments ?? []).filter((e: any) => e.status === 'active').length
                  const waitlist = (cls.enrollments ?? []).filter((e: any) => e.status === 'waitlisted').length
                  const max = cls.max_students ?? 0
                  const full = max > 0 && active >= max
                  const bar = ['', 'b-pink', 'b-cyan', 'b-mint'][i % 4]
                  return (
                    <Link key={cls.id} href={`/classes/${cls.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                      <div className="row-time">
                        <div className="t">{formatTime(cls.start_time)}</div>
                        <div className="d">{cls.end_time ? `→ ${formatTime(cls.end_time)}` : ''}</div>
                      </div>
                      <div className={`row-bar ${bar}`} />
                      <div className="row-main">
                        <div className="t">{cls.name}</div>
                        <div className="s">
                          {cls.instructor ? `${cls.instructor.first_name} ${cls.instructor.last_name}` : 'Unassigned'} · {active}/{max} enrolled
                        </div>
                      </div>
                      <div className="row-tail">
                        {waitlist > 0 && <span className="tag tag-amber">Waitlist · {waitlist}</span>}
                        {full
                          ? <span className="tag tag-mint"><span className="dot-sm" style={{ background: '#10b981' }} /> Full</span>
                          : <span className="tag tag-blue">{max - active} open</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="glass-thin" style={{ padding: 20, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
                  <span style={{ color: 'white', fontWeight: 700 }}>✓</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>Nothing scheduled today</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>No classes on the calendar — the studio is dark today.</div>
                </div>
              </div>
            )}
          </div>

          <div className="glass card">
            <div className="section-head">
              <div className="h3">Studio at a glance</div>
              <Link href="/reports" className="link">Reports →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const items = [] as { label: string; sub: string; pct: number; right: string }[]
                const enrolledToday = (todaysClasses ?? []).reduce((s: number, c: any) => s + (c.enrollments ?? []).filter((e: any) => e.status === 'active').length, 0)
                const capToday = (todaysClasses ?? []).reduce((s: number, c: any) => s + (c.max_students ?? 0), 0)
                const capPct = capToday > 0 ? Math.round((enrolledToday / capToday) * 100) : 0
                items.push({
                  label: "Today's class capacity",
                  sub: `${enrolledToday} of ${capToday} seats filled`,
                  pct: capPct,
                  right: `${capPct}%`,
                })
                const billedTotal = revenueThisMonth + outstandingTotal
                const paidPct = billedTotal > 0 ? Math.round((revenueThisMonth / billedTotal) * 100) : 100
                items.push({
                  label: 'Payment health (this month)',
                  sub: `${formatCurrency(revenueThisMonth)} collected · ${formatCurrency(outstandingTotal)} outstanding`,
                  pct: paidPct,
                  right: `${paidPct}%`,
                })
                return items.map((p, i) => (
                  <div key={i}>
                    <div className="spread" style={{ marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{p.sub}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{p.right}</div>
                    </div>
                    <div className="progress"><div className="fill" style={{ width: `${Math.min(100, Math.max(0, p.pct))}%` }} /></div>
                  </div>
                ))
              })()}
              {((trialRequests ?? 0) + (waitlisted ?? 0) + (makeupsPending ?? 0) > 0) && (
                <Link href="/enrollments" className="glass-thin" style={{ padding: '12px 14px', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--grad-3), var(--grad-1))', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16 }}>
                    ✨
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{(trialRequests ?? 0) + (waitlisted ?? 0)} dancers waiting on a decision</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{trialRequests ?? 0} trial · {waitlisted ?? 0} waitlisted · {makeupsPending ?? 0} make-ups</div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Coming up at the studio */}
        {(upcomingParties ?? []).length > 0 && (
          <div className="glass card">
            <div className="section-head">
              <div className="h3">Coming up at the studio</div>
              <Link href="/parties" className="btn btn-ghost btn-sm">All events →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(upcomingParties ?? []).slice(0, 3).map((p: any, i: number) => {
                const cover = ['photo-ph', 'photo-ph alt-1', 'photo-ph alt-2', 'photo-ph alt-3'][i % 4]
                const eventDate = new Date(p.event_date)
                const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <Link key={p.id} href="/parties" className="glass-thin" style={{ borderRadius: 18, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                    <div className={`photo ${cover}`} style={{ aspectRatio: '16 / 10', borderRadius: 0 }}>
                      <span className="tag" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,.95)', color: 'var(--ink-1)', backdropFilter: 'blur(8px)' }}>
                        {p.package ?? 'Event'}
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.015em' }}>{p.contact_name || 'Studio Event'}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 12 }}>
                        <span>{dateStr}</span>
                        {p.start_time && <span>{formatTime(p.start_time)}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {p.room?.name ?? 'Studio'} · <span className="tag tag-iris" style={{ marginLeft: 4 }}>{p.status}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Latest from the studio + Faculty teaching this week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnnouncementsPanel announcements={(announcements ?? []) as any} />
          <FacultyTeachingPanel instructors={(facultyTeaching ?? []) as any} />
        </div>

        {/* Recent enrollment activity + Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass card">
            <div className="section-head">
              <div className="h3">Recent enrollments</div>
              <Link href="/enrollments" className="btn btn-ghost btn-sm">All →</Link>
            </div>
            <RecentEnrollments enrollments={(recentEnrollments ?? []) as any} />
          </div>
          <RevenueChart data={revenueByMonth} />
        </div>
      </div>
    </div>
  )
}
