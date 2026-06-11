import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'

// GET /api/notifications — recent studio notifications + unread count for the
// admin bell menu.
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const [{ data: items }, { count: unread }] = await Promise.all([
    auth.admin
      .from('notifications')
      .select('id, type, title, body, href, read, created_at')
      .eq('audience', 'admin')
      .order('created_at', { ascending: false })
      .limit(30),
    auth.admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('audience', 'admin')
      .eq('read', false),
  ])

  return NextResponse.json({ items: items ?? [], unread: unread ?? 0 })
}
