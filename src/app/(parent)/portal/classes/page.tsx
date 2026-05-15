import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime, cn } from '@/lib/utils'
import ClassEnrollCard from '@/components/portal/ClassEnrollCard'
import SectionHead from '@/components/admin/SectionHead'

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
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Classes</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Your dancers' schedule.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {enrollments?.length
            ? `${enrollments.length} active enrollment${enrollments.length === 1 ? '' : 's'} across ${students.length} dancer${students.length === 1 ? '' : 's'}.`
            : 'No active enrollments yet — browse open classes below.'}
        </p>
      </div>

      <SectionHead label="Enrolled classes" />
      {!enrollments?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No active enrollments.</p>
      ) : (
        <div className="tight-list">
          {enrollments.map((e: any) => (
            <div key={e.id} className="tl-row">
              <div className="tl-lead">
                <div className="t" style={{ textTransform: 'capitalize' }}>{e.class?.day_of_week?.slice(0, 3)}</div>
                <div className="s">{formatTime(e.class?.start_time)}</div>
              </div>
              <div className="tl-main">
                <div className="t">{e.class?.name}</div>
                <div className="s">
                  {studentName(e.student_id)}
                  {e.class?.instructor && <> · {e.class.instructor.first_name} {e.class.instructor.last_name}</>}
                  {e.class?.room && <> · {e.class.room.name}</>}
                </div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', e.status === 'active' ? 'tag-mint' : 'tag-amber')}>{e.status}</span>
                <span style={{ fontWeight: 600, color: 'var(--ink-1)' }}>${e.class?.monthly_tuition}/mo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Open for registration" />
      {!availableClasses?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No classes open for registration right now.</p>
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
    </div>
  )
}
