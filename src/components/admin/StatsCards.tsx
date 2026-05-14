import { Users, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  totalStudents: number
  classesThisWeek: number
  revenueThisMonth: number
  outstandingTotal: number
}

interface StatProps {
  label: string
  value: string | number
  icon: React.ReactNode
  delta?: { value: string; dir: 'up' | 'dn' }
}

function Stat({ label, value, icon, delta }: StatProps) {
  return (
    <div className="glass card stat-card">
      <div className="spread">
        <div className="icon-cap">{icon}</div>
        {delta && (
          <span className={`delta ${delta.dir}`} style={{ alignSelf: 'flex-start' }}>
            {delta.dir === 'up' ? '↑' : '↓'} {delta.value}
          </span>
        )}
      </div>
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  )
}

export default function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Stat label="Active dancers"    value={props.totalStudents}                    icon={<Users size={18} />} />
      <Stat label="Active classes"    value={props.classesThisWeek}                  icon={<Calendar size={18} />} />
      <Stat label="Revenue this month" value={formatCurrency(props.revenueThisMonth)} icon={<DollarSign size={18} />} />
      <Stat label="Outstanding"        value={formatCurrency(props.outstandingTotal)} icon={<AlertCircle size={18} />} />
    </div>
  )
}
