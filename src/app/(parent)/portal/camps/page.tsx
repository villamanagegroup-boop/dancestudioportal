import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate, cn } from '@/lib/utils'
import CampSignupCard from '@/components/portal/CampSignupCard'
import SectionHead from '@/components/admin/SectionHead'

const STATUS_TAG: Record<string, string> = {
  registered: 'tag-mint',
  waitlisted: 'tag-amber',
  completed: 'tag-blue',
  cancelled: 'tag-pink',
}

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentCampsPage() {
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

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: myRegs }, { data: availableCamps }] = await Promise.all([
    studentIds.length > 0
      ? db
          .from('camp_registrations')
          .select(`
            id, status, payment_status, student_id,
            camp:camps(id, name, start_date, end_date, start_time, end_time,
              what_to_bring, parent_notes)
          `)
          .in('student_id', studentIds)
          .not('status', 'eq', 'cancelled')
      : Promise.resolve({ data: [] as any[] }),
    db
      .from('camps')
      .select('id, name, description, start_date, end_date, price, age_min, age_max, max_capacity')
      .eq('active', true)
      .eq('registration_open', true)
      .gte('end_date', today)
      .order('start_date'),
  ])

  const campIds = (availableCamps ?? []).map(c => c.id)
  const registeredCounts: Record<string, number> = {}
  if (campIds.length > 0) {
    const { data: counts } = await db
      .from('camp_registrations')
      .select('camp_id')
      .in('camp_id', campIds)
      .eq('status', 'registered')
    for (const row of counts ?? []) {
      registeredCounts[row.camp_id] = (registeredCounts[row.camp_id] ?? 0) + 1
    }
  }

  const studentName = (id: string) => {
    const s = students.find(x => x.id === id)
    return s ? `${s.first_name} ${s.last_name}` : 'Dancer'
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Camps</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Summer camps & intensives.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {myRegs?.length
            ? `${myRegs.length} camp registration${myRegs.length === 1 ? '' : 's'} for your dancers.`
            : 'Browse what’s open for sign-up below.'}
        </p>
      </div>

      <SectionHead label="Your camps" />
      {!myRegs?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No camp registrations yet.</p>
      ) : (
        <div className="tight-list">
          {myRegs.map((r: any) => (
            <div key={r.id} className="tl-row">
              <div className="tl-lead">
                <div className="t">{r.camp ? formatDate(r.camp.start_date).replace(/, \d{4}$/, '') : ''}</div>
                <div className="s">{r.camp ? formatDate(r.camp.end_date).replace(/, \d{4}$/, '') : ''}</div>
              </div>
              <div className="tl-main">
                <div className="t">{r.camp?.name ?? 'Camp'}</div>
                <div className="s">
                  {studentName(r.student_id)}
                  {(r.camp?.what_to_bring || r.camp?.parent_notes) && <> · See notes below</>}
                </div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', STATUS_TAG[r.status] ?? 'tag-blue')}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Open for registration" />
      {!availableCamps?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>No camps open for registration right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableCamps.map(c => {
            const spotsLeft =
              c.max_capacity != null
                ? Math.max(0, c.max_capacity - (registeredCounts[c.id] ?? 0))
                : null
            return (
              <CampSignupCard
                key={c.id}
                camp={{
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  start_date: c.start_date,
                  end_date: c.end_date,
                  price: Number(c.price),
                  age_min: c.age_min,
                  age_max: c.age_max,
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
