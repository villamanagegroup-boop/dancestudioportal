import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate } from '@/lib/utils'
import Header from '@/components/admin/Header'

export default async function InstructorInboxPage() {
  const { db, effectiveId } = await getPortalViewer('i')

  if (!effectiveId) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Inbox" />
        <div className="flex-1 overflow-y-auto">
          <div className="page-gutter min-h-full">
            <div className="glass glass-page min-h-full">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Inbox</p>
              <h1 className="h1 mt-2" style={{ fontSize: 26 }}>Sign in to continue.</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Resolve class IDs this instructor teaches — for class-targeted messages
  const { data: classes } = await db
    .from('classes')
    .select('id')
    .eq('instructor_id', effectiveId)
  const classIds = (classes ?? []).map(c => c.id)

  let query = db
    .from('communications')
    .select(`
      id, subject, body, comm_type, target_type, sent_at, scheduled_for, created_at,
      sender:profiles!communications_sender_id_fkey(first_name, last_name),
      target_class:classes(name)
    `)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(100)

  // OR: target_instructor_id = me, target_type in (all_staff, everyone), target_class_id in my classes
  const filters = [
    `target_instructor_id.eq.${effectiveId}`,
    `target_type.in.(all_staff,everyone)`,
  ]
  if (classIds.length > 0) {
    filters.push(`target_class_id.in.(${classIds.join(',')})`)
  }
  query = query.or(filters.join(','))

  const { data: messages } = await query
  const list = messages ?? []

  function audienceLabel(m: any) {
    switch (m.target_type) {
      case 'all_staff': return 'All staff'
      case 'everyone': return 'Everyone'
      case 'class': return m.target_class?.name ?? 'A class'
      case 'staff_member': return 'Just you'
      default: return 'Announcement'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Inbox" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Messages</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                {list.length === 0
                  ? 'No messages yet — anything sent to staff or to your classes shows up here.'
                  : `${list.length} message${list.length === 1 ? '' : 's'} from your studio.`}
              </p>
            </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No messages.</p>
      ) : (
        <div className="space-y-6">
          {list.map((m: any) => (
            <article key={m.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 22 }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="tag tag-iris">{audienceLabel(m)}</span>
                {m.comm_type === 'reminder' && <span className="tag tag-amber">Reminder</span>}
                <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
                  {formatDate(m.sent_at)}
                  {m.sender && <> · from {m.sender.first_name} {m.sender.last_name}</>}
                </span>
              </div>
              <h2 className="h3" style={{ fontSize: 16 }}>{m.subject || '(no subject)'}</h2>
              <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {m.body}
              </p>
            </article>
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
