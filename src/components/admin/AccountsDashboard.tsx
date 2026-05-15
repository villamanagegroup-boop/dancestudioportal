import Link from 'next/link'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  totalFamilies: number
  activeFamilies: number
  newFamilies: number
  totalStudents: number
  activeStudents: number
  newStudents: number
  outstandingTotal: number
  outstandingCount: number
}

interface Props {
  stats: Stats
  recentFamilies: { id: string; name: string; email: string; student_count: number; created_at: string }[]
  recentStudents: { id: string; name: string; age: number | null; created_at: string }[]
  birthdays: { id: string; name: string; date: string; turningAge: number; daysUntil: number }[]
  outstandingFamilies: { id: string; name: string; amount: number; count: number }[]
}

function relDate(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AccountsDashboard({ stats, recentFamilies, recentStudents, birthdays, outstandingFamilies }: Props) {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Families', value: String(stats.totalFamilies), sub: `${stats.activeFamilies} active` },
        { label: 'Students', value: String(stats.totalStudents), sub: `${stats.activeStudents} active` },
        { label: 'New this month', value: `${stats.newFamilies} / ${stats.newStudents}`, sub: 'families / students' },
        { label: 'Outstanding', value: formatCurrency(stats.outstandingTotal), sub: `${stats.outstandingCount} open invoice${stats.outstandingCount === 1 ? '' : 's'}` },
      ]} />

      <hr className="section-rule" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div>
          <SectionHead label="Recent families" href="/families" action="All families →" />
          {recentFamilies.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No families yet.</p>
          ) : (
            <div className="tight-list">
              {recentFamilies.map(f => (
                <Link key={f.id} href={`/families/${f.id}`} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{f.name}</div>
                    <div className="s">{f.email || 'No email'}</div>
                  </div>
                  <div className="tl-trail">
                    <span>{f.student_count} dancer{f.student_count === 1 ? '' : 's'}</span>
                    <span style={{ color: 'var(--ink-4)' }}>·</span>
                    <span>{relDate(f.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHead label="Recent students" href="/students" action="All students →" />
          {recentStudents.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No students yet.</p>
          ) : (
            <div className="tight-list">
              {recentStudents.map(s => (
                <Link key={s.id} href={`/students/${s.id}`} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{s.name}</div>
                    <div className="s">{s.age != null ? `${s.age} years old` : 'Age not set'}</div>
                  </div>
                  <div className="tl-trail">{relDate(s.created_at)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="section-rule" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div>
          <SectionHead label="Upcoming dancer birthdays" href="/students" action="All students →" />
          {birthdays.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No birthdays in the next 30 days.</p>
          ) : (
            <div className="tight-list">
              {birthdays.map(b => (
                <Link key={b.id} href={`/students/${b.id}`} className="tl-row">
                  <div className="tl-lead">
                    <div className="t">{b.date}</div>
                    <div className="s">{b.daysUntil === 0 ? 'today' : `in ${b.daysUntil}d`}</div>
                  </div>
                  <div className="tl-main">
                    <div className="t">{b.name}</div>
                    <div className="s">Turning {b.turningAge}</div>
                  </div>
                  <div className="tl-trail" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHead label="Accounts with a balance" href="/billing" action="Billing →" />
          {outstandingFamilies.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No outstanding balances.</p>
          ) : (
            <div className="tight-list">
              {outstandingFamilies.map(f => (
                <Link key={f.id} href={`/families/${f.id}`} className="tl-row no-lead">
                  <div className="tl-main">
                    <div className="t">{f.name}</div>
                    <div className="s">{f.count} open invoice{f.count === 1 ? '' : 's'}</div>
                  </div>
                  <div className="tl-trail" style={{ color: '#dc2626', fontWeight: 600 }}>
                    {formatCurrency(f.amount)}
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
