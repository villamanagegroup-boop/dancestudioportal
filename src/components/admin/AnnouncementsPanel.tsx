import Link from 'next/link'
import { Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  subject: string | null
  body: string
  created_at: string
  sender: { first_name: string; last_name: string } | null
}

function relTime(d: string) {
  const created = new Date(d).getTime()
  const now = Date.now()
  const diff = Math.floor((now - created) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'CS'
}

export default function AnnouncementsPanel({ announcements }: { announcements: Announcement[] }) {
  const unreadIdx = Math.min(2, announcements.length) // visually mark the most recent as fresh

  return (
    <div className="glass card">
      <div className="section-head">
        <div className="h3 flex items-center gap-2">
          <Megaphone size={16} style={{ color: 'var(--grad-1)' }} />
          Latest from the studio
        </div>
        <Link href="/communications" className="btn btn-ghost btn-sm">Inbox →</Link>
      </div>

      {announcements.length === 0 ? (
        <div className="glass-thin" style={{ padding: 20, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <Megaphone size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>No announcements yet</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              Messages sent from Communications land here and in the parent portal.
            </div>
          </div>
          <Link href="/communications" className="btn btn-ghost btn-sm">Create →</Link>
        </div>
      ) : (
        <div className="list">
          {announcements.map((a, i) => {
            const fromName = a.sender ? `${a.sender.first_name} ${a.sender.last_name}` : 'Studio Front Desk'
            const isUnread = i < unreadIdx
            return (
              <div key={a.id} className={`msg-row ${isUnread ? 'unread' : ''}`}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2) 55%, var(--grad-3))',
                    color: 'white', fontWeight: 700, fontSize: 13,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    border: '2px solid rgba(255,255,255,.85)',
                    boxShadow: '0 4px 12px rgba(40,32,120,.12)',
                  }}
                >
                  {a.sender ? initials(a.sender.first_name, a.sender.last_name) : 'CS'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="spread">
                    <div className="from">{fromName}</div>
                    <div className="time">{relTime(a.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 1 }}>{a.subject ?? 'Announcement'}</div>
                  <div className="preview">{a.body}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
