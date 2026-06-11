import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'

// POST /api/notifications/read — mark notifications read.
// Body: { id } to mark one, or { all: true } to clear the whole admin feed.
export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))

  let query = auth.admin.from('notifications').update({ read: true }).eq('audience', 'admin')
  if (body.all === true) {
    query = query.eq('read', false)
  } else if (typeof body.id === 'string') {
    query = query.eq('id', body.id)
  } else {
    return NextResponse.json({ error: 'Provide an id or all:true' }, { status: 400 })
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
