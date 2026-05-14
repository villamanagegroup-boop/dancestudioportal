import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate, cn } from '@/lib/utils'
import CampSignupCard from '@/components/portal/CampSignupCard'

const STATUS_STYLE: Record<string, string> = {
  registered: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
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

  // Spots left per available camp
  const campIds = (availableCamps ?? []).map(c => c.id)
  let registeredCounts: Record<string, number> = {}
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Camps</h1>

      {/* Registered camps */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Camps</h2>
        {!myRegs?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No camp registrations yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myRegs.map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{r.camp?.name ?? 'Camp'}</h3>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
                    STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-600')}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{studentName(r.student_id)}</p>
                {r.camp && (
                  <p className="text-sm text-gray-500">
                    {formatDate(r.camp.start_date)} – {formatDate(r.camp.end_date)}
                  </p>
                )}
                {r.camp?.what_to_bring && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What to bring</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.camp.what_to_bring}</p>
                  </div>
                )}
                {r.camp?.parent_notes && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.camp.parent_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available camps */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Open for Registration</h2>
        {!availableCamps?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            No camps open for registration right now
          </div>
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
      </section>
    </div>
  )
}
