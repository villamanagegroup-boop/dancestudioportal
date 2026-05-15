import Link from 'next/link'
import { Home, GraduationCap, UserPlus, AlertTriangle, Cake, ArrowRight } from 'lucide-react'
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
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

function Panel({ title, href, linkLabel, empty, children }: {
  title: string; href: string; linkLabel: string; empty: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs font-medium text-studio-600 hover:text-studio-700 flex items-center gap-1">
          {linkLabel} <ArrowRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">{children ?? <div className="px-5 py-8 text-center text-sm text-gray-400">{empty}</div>}</div>
    </div>
  )
}

export default function AccountsDashboard({ stats, recentFamilies, recentStudents, birthdays, outstandingFamilies }: Props) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Home} label="Families" value={String(stats.totalFamilies)} sub={`${stats.activeFamilies} active`} />
        <StatCard icon={GraduationCap} label="Students" value={String(stats.totalStudents)} sub={`${stats.activeStudents} active`} />
        <StatCard icon={UserPlus} label="New This Month" value={`${stats.newFamilies} / ${stats.newStudents}`} sub="families / students" />
        <StatCard
          icon={AlertTriangle}
          label="Outstanding Balance"
          value={formatCurrency(stats.outstandingTotal)}
          sub={`${stats.outstandingCount} open invoice${stats.outstandingCount === 1 ? '' : 's'}`}
        />
      </div>

      {/* Recently added */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Recently Added Families" href="/families" linkLabel="All families" empty="No families yet">
          {recentFamilies.length > 0 && recentFamilies.map(f => (
            <Link key={f.id} href={`/families/${f.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-semibold text-sm shrink-0">
                {f.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-400 truncate">{f.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">{f.student_count} dancer{f.student_count === 1 ? '' : 's'}</p>
                <p className="text-[11px] text-gray-400">{relDate(f.created_at)}</p>
              </div>
            </Link>
          ))}
        </Panel>

        <Panel title="Recently Added Students" href="/students" linkLabel="All students" empty="No students yet">
          {recentStudents.length > 0 && recentStudents.map(s => (
            <Link key={s.id} href={`/students/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm shrink-0">
                {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400">{s.age != null ? `${s.age} years old` : 'Age not set'}</p>
              </div>
              <p className="text-[11px] text-gray-400 shrink-0">{relDate(s.created_at)}</p>
            </Link>
          ))}
        </Panel>
      </div>

      {/* Birthdays + outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Upcoming Dancer Birthdays" href="/students" linkLabel="All students" empty="No birthdays in the next 30 days">
          {birthdays.length > 0 && birthdays.map(b => (
            <Link key={b.id} href={`/students/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                <Cake size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                <p className="text-xs text-gray-400">Turning {b.turningAge}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-700">{b.date}</p>
                <p className="text-[11px] text-gray-400">{b.daysUntil === 0 ? 'today' : `in ${b.daysUntil}d`}</p>
              </div>
            </Link>
          ))}
        </Panel>

        <Panel title="Accounts with a Balance" href="/billing" linkLabel="Billing" empty="No outstanding balances">
          {outstandingFamilies.length > 0 && outstandingFamilies.map(f => (
            <Link key={f.id} href={`/families/${f.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-semibold text-sm shrink-0">
                {f.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{f.count} open invoice{f.count === 1 ? '' : 's'}</p>
              </div>
              <p className="text-sm font-semibold text-red-600 shrink-0">{formatCurrency(f.amount)}</p>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  )
}
