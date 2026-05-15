import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate } from '@/lib/utils'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentAnnouncementsPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: gs } = await db
    .from('guardian_students').select('student_id').eq('guardian_id', gid)
  const studentIds = (gs ?? []).map(r => r.student_id)

  const { data: enr } = studentIds.length
    ? await db.from('enrollments').select('class_id').in('student_id', studentIds)
    : { data: [] as any[] }
  const classIds = [...new Set((enr ?? []).map((e: any) => e.class_id).filter(Boolean))]

  let query = db
    .from('communications')
    .select('id, subject, body, comm_type, sent_at, created_at, target_all, class:classes(name)')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(50)
  query = classIds.length
    ? query.or(`target_all.eq.true,target_class_id.in.(${classIds.join(',')})`)
    : query.eq('target_all', true)

  const { data: announcements } = await query
  const list = announcements ?? []

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>News</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Announcements & updates.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {list.length === 0 ? 'Nothing posted yet.' : `${list.length} update${list.length === 1 ? '' : 's'} from your studio.`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No announcements yet.</p>
      ) : (
        <div className="space-y-6">
          {list.map((a: any) => (
            <article key={a.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 22 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="tag tag-iris">
                  {a.target_all ? 'Studio-wide' : a.class?.name ?? 'Class'}
                </span>
                <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
                  {formatDate(a.sent_at ?? a.created_at)}
                </span>
              </div>
              <h2 className="h3" style={{ fontSize: 16 }}>{a.subject ?? '(no subject)'}</h2>
              <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {a.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
