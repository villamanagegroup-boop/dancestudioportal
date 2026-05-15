import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime, formatDate, getAgeFromDob, cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'

const NO_ID = '00000000-0000-0000-0000-000000000000'

const STATUS_TAG: Record<string, string> = {
  active: 'tag-mint',
  registered: 'tag-mint',
  waitlisted: 'tag-amber',
  completed: 'tag-blue',
  dropped: 'tag-pink',
  cancelled: 'tag-pink',
  pending: 'tag-blue',
}

export default async function DancerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

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
      db.from('documents').select('id, title, document_type, signed_at').eq('student_id', id),
    ])

  const presentCount = (attendance ?? []).filter(a => a.present).length
  const totalSessions = (attendance ?? []).length
  const activeClasses = (enrollments ?? []).filter(e => e.status === 'active').length
  const activeCamps = (campRegs ?? []).filter(c => c.status === 'registered').length

  return (
    <div>
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Dancer profile</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          {student.first_name} {student.last_name}
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {getAgeFromDob(student.date_of_birth)} years old
        </p>
      </div>

      <KpiStrip
        items={[
          { label: 'Active classes', value: String(activeClasses) },
          { label: 'Active camps', value: String(activeCamps) },
          { label: 'Attendance', value: totalSessions > 0 ? `${presentCount}/${totalSessions}` : '—' },
        ]}
      />

      <hr className="section-rule" />

      <SectionHead label="Classes" />
      {!enrollments?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>Not enrolled in any classes.</p>
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
                  {e.class?.instructor && <>{e.class.instructor.first_name} {e.class.instructor.last_name}</>}
                  {e.class?.room && <> · {e.class.room.name}</>}
                </div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', STATUS_TAG[e.status] ?? 'tag-blue')}>{e.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Camps" />
      {!campRegs?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>Not registered for any camps.</p>
      ) : (
        <div className="tight-list">
          {campRegs.map((c: any) => (
            <div key={c.id} className="tl-row no-lead">
              <div className="tl-main">
                <div className="t">{c.camp?.name}</div>
                <div className="s">
                  {c.camp && <>{formatDate(c.camp.start_date)} – {formatDate(c.camp.end_date)}</>}
                </div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', STATUS_TAG[c.status] ?? 'tag-blue')}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="section-rule" />

      <SectionHead label="Documents" href="/portal/documents" action="Upload forms →" />
      {!documents?.length ? (
        <p className="muted" style={{ fontSize: 13 }}>
          No documents on file. <Link href="/portal/documents" style={{ color: 'var(--grad-1)' }}>Upload forms →</Link>
        </p>
      ) : (
        <div className="tight-list">
          {documents.map((d: any) => (
            <div key={d.id} className="tl-row no-lead">
              <div className="tl-main">
                <div className="t">{d.title}</div>
                <div className="s">{d.document_type}</div>
              </div>
              <div className="tl-trail">
                <span className={cn('tag', d.signed_at ? 'tag-mint' : 'tag-amber')}>
                  {d.signed_at ? 'On file' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
