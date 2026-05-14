import { formatDate } from '@/lib/utils'
import { getEnrollmentStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Enrollment {
  id: string
  enrolled_at: string
  status: string
  student: { first_name: string; last_name: string } | null
  class: { name: string } | null
}

export default function RecentEnrollments({ enrollments }: { enrollments: Enrollment[] }) {
  if (!enrollments.length) {
    return <div className="px-5 py-8 text-center text-gray-400 text-sm">No recent enrollments</div>
  }
  return (
    <div className="divide-y divide-gray-50">
      {enrollments.map(e => (
        <div key={e.id} className="px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'}
            </p>
            <p className="text-xs text-gray-500">{e.class?.name ?? '—'} · {formatDate(e.enrolled_at)}</p>
          </div>
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>
            {e.status}
          </span>
        </div>
      ))}
    </div>
  )
}
