import { getPortalViewer } from '@/lib/portal-viewer'
import { getParentPortalSettings } from '@/lib/portal-settings'
import { formatTime, cn } from '@/lib/utils'
import PortalClassBrowser from '@/components/portal/PortalClassBrowser'
import PortalPendingList from '@/components/portal/PortalPendingList'
import SectionHead from '@/components/admin/SectionHead'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentClassesPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID
  const settings = await getParentPortalSettings()

  if (!settings.show_classes) {
    return (
      <div className="py-16 text-center">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Classes</p>
        <h1 className="h1 mt-2" style={{ fontSize: 22 }}>Class registration is currently unavailable.</h1>
        <p className="mt-2 muted" style={{ fontSize: 13 }}>Please contact the studio to enroll.</p>
      </div>
    )
  }

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
        `).in('student_id', studentIds).in('status', ['active', 'waitlisted', 'pending'])
      : Promise.resolve({ data: [] as any[] }),
    db.from('classes').select(`
      id, name, day_of_week, start_time, end_time, monthly_tuition, max_students,
      age_min, age_max, gender,
      class_type:class_types(color, style),
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

  const enrolled = (enrollments ?? []).filter((e: any) => e.status !== 'pending')
  const pendingClasses = (enrollments ?? []).filter((e: any) => e.status === 'pending')

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Classes</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Your dancers' schedule.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {enrolled.length
            ? `${enrolled.length} active enrollment${enrolled.length === 1 ? '' : 's'} across ${students.length} dancer${students.length === 1 ? '' : 's'}.`
            : 'No active enrollments yet — browse open classes below.'}
        </p>
      </div>

      <SectionHead label="Enrolled classes" />
      {!enrolled.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No active enrollments.</p>
      ) : (
        <div className="tight-list">
          {enrolled.map((e: any) => (
            <div key={e.id} className="tl-row">
              <div className="tl-lead">
                <div className="t" style={{ textTransform: 'capitalize' }}>{e.class?.day_of_week?.slice(0, 3)}</div>
                <div className="s">{formatTime(e.class?.start_time)}</div>
              </div>
              <div className="tl-main">
                <div className="t">{e.class?.name}</div>
                <div className="s">
                  {studentName(e.student_id)}
                  {settings.show_instructors && e.class?.instructor && <> · {e.class.instructor.first_name} {e.class.instructor.last_name}</>}
                  {e.class?.room && <> · {e.class.room.name}</>}
                </div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', e.status === 'active' ? 'tag-mint' : 'tag-amber')}>{e.status}</span>
                {settings.show_tuition && <span style={{ fontWeight: 600, color: 'var(--ink-1)' }}>${e.class?.monthly_tuition}/mo</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingClasses.length > 0 && (
        <>
          <hr className="section-rule" />
          <SectionHead label="Pending approval" />
          <PortalPendingList items={pendingClasses.map((e: any) => ({
            id: e.id,
            kind: 'class' as const,
            title: e.class?.name ?? 'Class',
            subtitle: `${studentName(e.student_id)}${e.class?.day_of_week ? ` · ${e.class.day_of_week}` : ''}`,
          }))} />
        </>
      )}

      <hr className="section-rule" />

      <SectionHead label="Open for registration" />
      {!availableClasses?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No classes open for registration right now.</p>
      ) : (
        <PortalClassBrowser
          classes={(availableClasses as any[]).map(cls => ({
            id: cls.id,
            name: cls.name,
            day_of_week: cls.day_of_week,
            start_time: cls.start_time,
            end_time: cls.end_time,
            monthly_tuition: settings.show_tuition ? Number(cls.monthly_tuition) : null,
            color: cls.class_type?.color ?? '#7c3aed',
            style: cls.class_type?.style ?? null,
            age_min: cls.age_min,
            age_max: cls.age_max,
            gender: cls.gender,
            instructorName: settings.show_instructors && cls.instructor
              ? `${cls.instructor.first_name} ${cls.instructor.last_name}`
              : null,
            spotsLeft: cls.max_students != null
              ? Math.max(0, cls.max_students - (activeCounts[cls.id] ?? 0))
              : null,
          }))}
          students={students}
        />
      )}
    </div>
  )
}
