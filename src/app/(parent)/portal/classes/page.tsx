import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime, cn } from '@/lib/utils'
import ClassEnrollCard from '@/components/portal/ClassEnrollCard'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentClassesPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: guardianStudents } = await db
    .from('guardian_students')
    .select('student_id, student:students(id, first_name, last_name)')
    .eq('guardian_id', gid)

  const students = (guardianStudents ?? [])
    .map(gs => gs.student as any)
    .filter(Boolean) as { id: string; first_name: string; last_name: string }[]
  const studentIds = students.map(s => s.id)

  const [{ data: enrollments }, { data: availableClasses }] = await Promise.all([
    studentIds.length > 0
      ? db.from('enrollments').select(`
          id, status, student_id,
          class:classes(name, day_of_week, start_time, end_time, monthly_tuition,
            instructor:instructors(first_name, last_name), room:rooms(name))
        `).in('student_id', studentIds).in('status', ['active', 'waitlisted'])
      : Promise.resolve({ data: [] as any[] }),
    db.from('classes').select(`
      id, name, day_of_week, start_time, end_time, monthly_tuition, max_students,
      class_type:class_types(color),
      instructor:instructors(first_name, last_name)
    `)
      .eq('active', true)
      .eq('registration_open', true)
      .eq('internal_registration_only', false)
      .order('day_of_week').order('start_time'),
  ])

  // Active enrollment counts → spots left
  const classIds = (availableClasses ?? []).map(c => c.id)
  const activeCounts: Record<string, number> = {}
  if (classIds.length > 0) {
    const { data: counts } = await db
      .from('enrollments')
      .select('class_id')
      .in('class_id', classIds)
      .eq('status', 'active')
    for (const row of counts ?? []) {
      activeCounts[row.class_id] = (activeCounts[row.class_id] ?? 0) + 1
    }
  }

  const studentName = (id: string) => {
    const s = students.find(x => x.id === id)
    return s ? `${s.first_name} ${s.last_name}` : ''
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Classes</h1>

      {/* Enrolled classes */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Enrolled Classes</h2>
        {!enrollments?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No active enrollments
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enrollments.map((e: any) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{e.class?.name}</h3>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full',
                    e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {e.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{studentName(e.student_id)}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {e.class?.day_of_week} · {formatTime(e.class?.start_time)} – {formatTime(e.class?.end_time)}
                </p>
                {e.class?.instructor && (
                  <p className="text-sm text-gray-500">{e.class.instructor.first_name} {e.class.instructor.last_name}</p>
                )}
                {e.class?.room && <p className="text-sm text-gray-500">{e.class.room.name}</p>}
                <p className="text-sm font-semibold text-gray-900 mt-2">${e.class?.monthly_tuition}/mo</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available classes */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Open for Registration</h2>
        {!availableClasses?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No classes open for registration right now
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableClasses.map((cls: any) => {
              const spotsLeft =
                cls.max_students != null
                  ? Math.max(0, cls.max_students - (activeCounts[cls.id] ?? 0))
                  : null
              return (
                <ClassEnrollCard
                  key={cls.id}
                  cls={{
                    id: cls.id,
                    name: cls.name,
                    day_of_week: cls.day_of_week,
                    start_time: cls.start_time,
                    end_time: cls.end_time,
                    monthly_tuition: Number(cls.monthly_tuition),
                    color: cls.class_type?.color ?? '#7c3aed',
                    instructorName: cls.instructor
                      ? `${cls.instructor.first_name} ${cls.instructor.last_name}`
                      : null,
                    spotsLeft,
                  }}
                  students={students}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
