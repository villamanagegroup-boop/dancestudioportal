import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime, formatDate, getAgeFromDob, cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

const NO_ID = '00000000-0000-0000-0000-000000000000'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  registered: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  dropped: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
  pending: 'bg-gray-100 text-gray-600',
}

export default async function DancerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  // Confirm this dancer belongs to the (effective) guardian
  const { data: link } = await db
    .from('guardian_students')
    .select('student_id')
    .eq('guardian_id', gid)
    .eq('student_id', id)
    .maybeSingle()
  if (!link) notFound()

  const { data: student } = await db
    .from('students')
    .select('id, first_name, last_name, date_of_birth')
    .eq('id', id)
    .maybeSingle()
  if (!student) notFound()

  const [{ data: enrollments }, { data: campRegs }, { data: attendance }, { data: documents }] =
    await Promise.all([
      db.from('enrollments').select(`
        id, status,
        class:classes(name, day_of_week, start_time, end_time, monthly_tuition,
          instructor:instructors(first_name, last_name), room:rooms(name))
      `).eq('student_id', id),
      db.from('camp_registrations').select(`
        id, status, camp:camps(name, start_date, end_date)
      `).eq('student_id', id).not('status', 'eq', 'cancelled'),
      db.from('attendance').select('present').eq('student_id', id),
      db.from('documents').select('id, title, document_type, signed_at')
        .eq('student_id', id),
    ])

  const presentCount = (attendance ?? []).filter(a => a.present).length
  const totalSessions = (attendance ?? []).length

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back to home
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-lg">
          {student.first_name[0]}{student.last_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.first_name} {student.last_name}</h1>
          <p className="text-sm text-gray-500">{getAgeFromDob(student.date_of_birth)} years old</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-gray-900">
            {(enrollments ?? []).filter(e => e.status === 'active').length}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Classes</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-gray-900">
            {(campRegs ?? []).filter(c => c.status === 'registered').length}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Camps</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="text-2xl font-semibold text-gray-900">
            {totalSessions > 0 ? `${presentCount}/${totalSessions}` : '—'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Attendance</div>
        </div>
      </div>

      {/* Classes */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Classes</h2>
        {!enrollments?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm shadow-sm">
            Not enrolled in any classes
          </div>
        ) : (
          <div className="space-y-2">
            {enrollments.map((e: any) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{e.class?.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {e.class?.day_of_week} · {formatTime(e.class?.start_time)} – {formatTime(e.class?.end_time)}
                    </p>
                    {e.class?.instructor && (
                      <p className="text-sm text-gray-500">
                        {e.class.instructor.first_name} {e.class.instructor.last_name}
                        {e.class?.room ? ` · ${e.class.room.name}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0',
                    STATUS_STYLE[e.status] ?? 'bg-gray-100 text-gray-600')}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Camps */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Camps</h2>
        {!campRegs?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm shadow-sm">
            Not registered for any camps
          </div>
        ) : (
          <div className="space-y-2">
            {campRegs.map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.camp?.name}</h3>
                  {c.camp && (
                    <p className="text-sm text-gray-600">
                      {formatDate(c.camp.start_date)} – {formatDate(c.camp.end_date)}
                    </p>
                  )}
                </div>
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0',
                  STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-600')}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</h2>
        {!documents?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm shadow-sm">
            No documents on file —{' '}
            <Link href="/portal/documents" className="text-studio-600 hover:text-studio-700">upload forms</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((d: any) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{d.title}</p>
                  <p className="text-xs text-gray-400">{d.document_type}</p>
                </div>
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0',
                  d.signed_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                  {d.signed_at ? 'On file' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
