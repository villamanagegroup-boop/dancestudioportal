import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatTime, cn } from '@/lib/utils'

export default async function ParentClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: guardianStudents } = await supabase
    .from('guardian_students')
    .select('student_id, student:students(id, first_name, last_name)')
    .eq('guardian_id', user.id)

  const studentIds = guardianStudents?.map(gs => gs.student_id) ?? []

  const [{ data: enrollments }, { data: availableClasses }] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('enrollments').select(`
          id, status, student_id,
          class:classes(name, day_of_week, start_time, end_time, monthly_tuition,
            instructor:instructors(first_name, last_name), room:rooms(name))
        `).in('student_id', studentIds).in('status', ['active', 'waitlisted'])
      : Promise.resolve({ data: [] }),
    supabase.from('classes').select(`
      id, name, day_of_week, start_time, end_time, monthly_tuition, max_students,
      class_type:class_types(name, style, color),
      instructor:instructors(first_name, last_name)
    `).eq('active', true).order('day_of_week').order('start_time'),
  ])

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
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Available Classes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableClasses?.map((cls: any) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.class_type?.color ?? '#7c3aed' }} />
                <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              </div>
              <p className="text-sm text-gray-600 capitalize">
                {cls.day_of_week} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
              </p>
              {cls.instructor && (
                <p className="text-sm text-gray-500">{cls.instructor.first_name} {cls.instructor.last_name}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-semibold text-gray-900">${cls.monthly_tuition}/mo</p>
                <button className="text-sm font-medium text-studio-600 hover:text-studio-700">
                  Join Waitlist
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
