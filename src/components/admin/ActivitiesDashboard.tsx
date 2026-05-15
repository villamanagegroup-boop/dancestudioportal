import Link from 'next/link'
import { Calendar, Tent, ClipboardList, ArrowRight, Users, Clock } from 'lucide-react'
import { getEnrollmentStatusColor, cn } from '@/lib/utils'

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

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-studio-600" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, description, count }: {
  href: string; icon: React.ElementType; label: string; description: string; count: number
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-center gap-4"
    >
      <span className="w-11 h-11 rounded-xl bg-studio-50 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-studio-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-semibold text-gray-900">{count}</p>
        <ArrowRight size={14} className="text-gray-300 ml-auto" />
      </div>
    </Link>
  )
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

export default function ActivitiesDashboard({ stats, recentEnrollments, upcomingCamps }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Active Classes" value={String(stats.activeClasses)} />
        <StatCard icon={Tent} label="Active Camps" value={String(stats.activeCamps)} />
        <StatCard icon={Users} label="Active Enrollments" value={String(stats.activeEnrollments)} sub={`${stats.totalEnrollments} total`} />
        <StatCard icon={Clock} label="Waitlisted / Pending" value={`${stats.waitlisted} / ${stats.pending}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/classes" icon={Calendar} label="Classes" description="Schedule & rosters" count={stats.activeClasses} />
        <QuickLink href="/camps" icon={Tent} label="Camps" description="Intensives & programs" count={stats.activeCamps} />
        <QuickLink href="/enrollments" icon={ClipboardList} label="Enrollments" description="Registrations & waitlists" count={stats.totalEnrollments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Enrollments</h2>
            <Link href="/enrollments" className="text-xs font-medium text-studio-600 hover:text-studio-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentEnrollments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No enrollments yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentEnrollments.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {e.student ? `${e.student.first_name} ${e.student.last_name}` : 'Unknown student'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{e.class?.name ?? 'Unknown class'}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize shrink-0', getEnrollmentStatusColor(e.status))}>
                    {e.status}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0 w-16 text-right">{relDate(e.enrolled_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming Camps</h2>
            <Link href="/camps" className="text-xs font-medium text-studio-600 hover:text-studio-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {upcomingCamps.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming camps</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingCamps.map(c => (
                <Link key={c.id} href={`/camps/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <span className="w-9 h-9 rounded-lg bg-studio-50 flex items-center justify-center text-studio-600 shrink-0">
                    <Tent size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.max_capacity ? `Up to ${c.max_capacity} dancers` : 'No capacity set'}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {dateLabel(c.start_date)} – {dateLabel(c.end_date)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
