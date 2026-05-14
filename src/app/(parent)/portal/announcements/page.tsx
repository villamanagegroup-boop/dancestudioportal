import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate } from '@/lib/utils'
import { Megaphone } from 'lucide-react'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export default async function ParentAnnouncementsPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  // Which classes the family is in → which class announcements they see
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">News &amp; Announcements</h1>

      {!announcements?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
          <Megaphone size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-studio-50 text-studio-700">
                  {a.target_all ? 'Studio-wide' : a.class?.name ?? 'Class'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDate(a.sent_at ?? a.created_at)}
                </span>
              </div>
              <h2 className="font-semibold text-gray-900">{a.subject ?? '(no subject)'}</h2>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
