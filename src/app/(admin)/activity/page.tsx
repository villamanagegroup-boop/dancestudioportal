import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import ActivityFilters from '@/components/admin/ActivityFilters'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ cat?: string; days?: string; q?: string }>
}

interface LogRow {
  id: string
  actor_name: string | null
  actor_role: string | null
  action: string
  target_table: string | null
  target_id: string | null
  target_label: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// Map a logged target to its detail page, when one exists.
function hrefForTarget(table: string | null, id: string | null): string | null {
  if (!id) {
    // Some targets have a list page even without a per-row detail page.
    if (table === 'site_intake') return '/intake'
    return null
  }
  switch (table) {
    case 'students': return `/students/${id}`
    case 'profiles': return `/families/${id}`
    case 'classes': return `/classes/${id}`
    case 'camps': return `/camps/${id}`
    case 'parties': return `/parties/${id}`
    case 'instructors': return `/staff/${id}`
    case 'site_intake': return '/intake'
    case 'enrollments': return '/enrollments'
    case 'camp_registrations': return '/camps'
    default: return null
  }
}

// Human-readable verb for an action key like 'student.updated'.
function describeAction(action: string): string {
  const map: Record<string, string> = {
    'auth.signed_in': 'signed in',
    'student.created': 'added a student',
    'student.updated': 'updated a student',
    'student.deleted': 'deleted a student',
    'family.created': 'added a family',
    'family.updated': 'updated a family',
    'family.deleted': 'deleted a family',
    'enrollment.created': 'enrolled a student',
    'enrollment.updated': 'updated an enrollment',
    'enrollment.dropped': 'dropped an enrollment',
    'enrollment.deleted': 'removed an enrollment',
    'class.created': 'created a class',
    'class.updated': 'updated a class',
    'class.deleted': 'deleted a class',
    'camp.created': 'created a camp',
    'camp.updated': 'updated a camp',
    'camp.deleted': 'deleted a camp',
    'camp_registration.created': 'registered a camper',
    'camp_registration.waitlisted': 'waitlisted a camper',
    'party.created': 'booked a party',
    'party.updated': 'updated a party',
    'party.deleted': 'deleted a party',
    'staff.created': 'added a staff member',
    'staff.updated': 'updated a staff member',
    'staff.deleted': 'removed a staff member',
    'payment.recorded': 'recorded a payment',
    'intake.received': 'new site submission',
    'intake.matched': 'matched a submission',
    'intake.converted': 'invited a new family',
    'intake.dismissed': 'dismissed a submission',
  }
  return map[action] ?? action.replace(/[._]/g, ' ')
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string | null): string {
  if (!name) return '·'
  return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const cat = sp.cat ?? ''
  const days = sp.days ?? '30'
  const q = sp.q ?? ''

  const supabase = createAdminClient()
  let query = supabase
    .from('activity_log')
    .select('id, actor_name, actor_role, action, target_table, target_id, target_label, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(250)

  if (cat) query = query.like('action', `${cat}%`)

  if (days !== 'all') {
    const n = Number(days)
    if (Number.isFinite(n)) {
      const cutoff = new Date(Date.now() - n * 86_400_000).toISOString()
      query = query.gte('created_at', cutoff)
    }
  }

  if (q) {
    const safe = q.replace(/[%,]/g, ' ')
    query = query.or(`target_label.ilike.%${safe}%,actor_name.ilike.%${safe}%,action.ilike.%${safe}%`)
  }

  const { data, error } = await query
  const rows = (data ?? []) as LogRow[]

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity log" subtitle="Every action across the studio — logins, changes, registrations, and payments" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <ActivityFilters cat={cat} days={days} q={q} />

            {error ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                Couldn&apos;t load activity: {error.message}
                {/\brelation\b|does not exist/i.test(error.message) && (
                  <div className="mt-1 text-red-600">
                    Run <code>supabase/migrations/activity_log_module.sql</code> to create the table.
                  </div>
                )}
              </div>
            ) : rows.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No activity in this range.</p>
            ) : (
              <div className="tight-list">
                {rows.map(r => {
                  const href = hrefForTarget(r.target_table, r.target_id)
                  const inner = (
                    <>
                      <div
                        className="flex items-center justify-center rounded-full flex-shrink-0 text-[11px] font-semibold"
                        style={{
                          width: 30, height: 30,
                          background: !r.actor_name && r.action.startsWith('intake')
                            ? 'rgba(245,158,11,0.15)' : 'rgba(20,24,80,0.07)',
                          color: 'var(--ink-2)',
                        }}
                      >
                        {initials(r.actor_name)}
                      </div>
                      <div className="tl-main min-w-0">
                        <div className="t truncate">
                          <span style={{ fontWeight: 600 }}>{r.actor_name ?? 'System'}</span>
                          <span style={{ color: 'var(--ink-3)' }}> {describeAction(r.action)}</span>
                          {r.target_label && <span> · {r.target_label}</span>}
                        </div>
                        <div className="s truncate" style={{ color: 'var(--ink-4)' }}>
                          {r.actor_role ?? 'system'} · {r.action}
                        </div>
                      </div>
                      <div className="tl-trail flex-shrink-0">
                        <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{relTime(r.created_at)}</span>
                      </div>
                    </>
                  )
                  return href ? (
                    <Link key={r.id} href={href} className="tl-row" style={{ alignItems: 'center', gap: 12 }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={r.id} className="tl-row" style={{ alignItems: 'center', gap: 12 }}>
                      {inner}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
