import Link from 'next/link'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'

interface Stats {
  activeClasses: number
  activeCamps: number
  totalEnrollments: number
  activeEnrollments: number
  waitlisted: number
  pending: number
}

interface Enrollment {
  id: string
  status: string
  enrolled_at: string
  student: { first_name: string; last_name: string } | null
  class: { name: string } | null
}

interface Camp {
  id: string
  name: string
  start_date: string
  end_date: string
  max_capacity: number | null
}

interface Props {
  stats: Stats
  recentEnrollments: Enrollment[]
  upcomingCamps: Camp[]
}

function relDate(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dateLabel(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusTag(status: string) {
  if (status === 'active') return 'tag-mint'
  if (status === 'waitlisted') return 'tag-amber'
  if (status === 'dropped') return 'tag-pink'
  return 'tag-blue'
}

export default function ActivitiesDashboard({ stats, recentEnrollments, upcomingCamps }: Props) {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Active classes', value: String(stats.activeClasses) },
        { label: 'Active camps', value: String(stats.activeCamps) },
        { label: 'Active enrollments', value: String(stats.activeEnrollments), sub: `${stats.totalEnrollments} total` },
        { label: 'Waitlisted / pending', value: `${stats.waitlisted} / ${stats.pending}` },
      ]} />

      <hr className="section-rule" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div>
          <SectionHead label="Recent enrollments" href="/enrollments" action="View all →" />
          {recentEnrollments.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No enrollments yet.</p>
          ) : (
            <div className="tight-list">
              {recentEnrollments.map(e => (
                <div key={e.id} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{e.student ? `${e.student.first_name} ${e.student.last_name}` : 'Unknown'}</div>
                    <div className="s">{e.class?.name ?? '—'}</div>
                  </div>
                  <div className="tl-trail">
                    <span className={`tag ${statusTag(e.status)}`}>{e.status}</span>
                    <span>{relDate(e.enrolled_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHead label="Upcoming camps" href="/camps" action="View all →" />
          {upcomingCamps.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No upcoming camps.</p>
          ) : (
            <div className="tight-list">
              {upcomingCamps.map(c => (
                <Link key={c.id} href={`/camps/${c.id}`} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{c.name}</div>
                    <div className="s">{c.max_capacity ? `Up to ${c.max_capacity} dancers` : 'No capacity set'}</div>
                  </div>
                  <div className="tl-trail">
                    {dateLabel(c.start_date)} – {dateLabel(c.end_date)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
