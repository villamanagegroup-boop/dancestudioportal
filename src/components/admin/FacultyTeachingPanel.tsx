import Link from 'next/link'
import { Users } from 'lucide-react'

interface Instructor {
  id: string
  first_name: string
  last_name: string
  bio: string | null
  specialties?: string[] | null
  styles?: string[] | null
  active?: boolean
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '??'
}

export default function FacultyTeachingPanel({ instructors }: { instructors: Instructor[] }) {
  const list = instructors.slice(0, 4)

  return (
    <div className="glass card">
      <div className="section-head">
        <div className="h3 flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--grad-1)' }} />
          Faculty teaching this week
        </div>
        <Link href="/staff" className="btn btn-ghost btn-sm">All faculty →</Link>
      </div>

      {list.length === 0 ? (
        <div className="glass-thin" style={{ padding: 20, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <Users size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>No instructors on the roster yet</div>
            <div className="muted" style={{ fontSize: 11.5 }}>Add staff to introduce them to dancers and families.</div>
          </div>
          <Link href="/staff" className="btn btn-ghost btn-sm">Add →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map(it => {
            const styles = (it.specialties ?? it.styles ?? []).slice(0, 2)
            return (
              <Link
                key={it.id}
                href={`/staff/${it.id}`}
                className="glass-thin"
                style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', borderRadius: 14, textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2) 55%, var(--grad-3))',
                    color: 'white', fontWeight: 700, fontSize: 14,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    border: '2px solid rgba(255,255,255,.85)',
                    boxShadow: '0 4px 12px rgba(40,32,120,.12)',
                  }}
                >
                  {initials(it.first_name, it.last_name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{it.first_name} {it.last_name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{styles[0] ?? 'Faculty'}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                    {styles.map(s => (
                      <span key={s} className="tag tag-iris">{s}</span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
