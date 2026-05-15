import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { getAgeFromDob } from '@/lib/utils'
import Header from '@/components/admin/Header'
import SectionHead from '@/components/admin/SectionHead'

export default async function InstructorStudentsPage() {
  const { db, effectiveId } = await getPortalViewer('i')

  if (!effectiveId) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Students" />
        <div className="flex-1 overflow-y-auto">
          <div className="page-gutter min-h-full">
            <div className="glass glass-page min-h-full">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Students</p>
              <h1 className="h1 mt-2" style={{ fontSize: 26 }}>Sign in to continue.</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: enrollments } = await db
    .from('enrollments')
    .select(`
      status,
      student:students!inner(id, first_name, last_name, date_of_birth, active),
      class:classes!inner(id, name, instructor_id)
    `)
    .eq('class.instructor_id', effectiveId)
    .eq('status', 'active')

  // Dedupe students, collect classes
  const studentMap = new Map<string, {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    active: boolean
    classes: string[]
  }>()
  for (const e of (enrollments ?? []) as any[]) {
    if (!e.student) continue
    const id = e.student.id
    if (!studentMap.has(id)) {
      studentMap.set(id, {
        id,
        first_name: e.student.first_name,
        last_name: e.student.last_name,
        date_of_birth: e.student.date_of_birth,
        active: e.student.active,
        classes: [],
      })
    }
    if (e.class?.name) studentMap.get(id)!.classes.push(e.class.name)
  }

  const students = [...studentMap.values()].sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
  )

  return (
    <div className="flex flex-col h-full">
      <Header title="Students" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Roster</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                {students.length === 0
                  ? 'No active enrollments in your classes yet.'
                  : `${students.length} dancer${students.length === 1 ? '' : 's'} across your classes.`}
              </p>
            </div>

      <SectionHead label="All students" />
      {students.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>You'll see dancers here once they enroll.</p>
      ) : (
        <div className="tight-list">
          {students.map(s => (
            <Link key={s.id} href={`/students/${s.id}`} className="tl-row no-lead">
              <div className="tl-main">
                <div className="t">{s.last_name}, {s.first_name}</div>
                <div className="s">
                  {s.date_of_birth ? `${getAgeFromDob(s.date_of_birth)} yrs · ` : ''}
                  {s.classes.length} class{s.classes.length === 1 ? '' : 'es'} · {s.classes.slice(0, 2).join(', ')}
                  {s.classes.length > 2 && ` +${s.classes.length - 2}`}
                </div>
              </div>
              <div className="tl-trail">View →</div>
            </Link>
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
