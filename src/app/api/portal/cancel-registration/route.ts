import { getPortalViewer } from '@/lib/portal-viewer'
import { logActivity } from '@/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/portal/cancel-registration — a parent cancels their own PENDING
// class enrollment or camp registration. Only pending requests can be cancelled
// here (confirmed enrollments are managed by the studio). Scoped: the dancer
// must belong to the acting guardian.
export async function POST(req: NextRequest) {
  const { kind, id } = await req.json()
  if (!id || (kind !== 'class' && kind !== 'camp')) {
    return NextResponse.json({ error: 'kind (class|camp) and id are required' }, { status: 400 })
  }

  const viewer = await getPortalViewer('g')
  const guardianId = viewer.effectiveId
  if (!guardianId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = viewer.db

  const table = kind === 'class' ? 'enrollments' : 'camp_registrations'
  const { data: row } = await admin.from(table).select('id, status, student_id').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  const { data: link } = await admin
    .from('guardian_students').select('id')
    .eq('guardian_id', guardianId).eq('student_id', row.student_id).maybeSingle()
  if (!link) return NextResponse.json({ error: 'That dancer is not on this account' }, { status: 403 })

  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending requests can be cancelled. Contact the studio to change a confirmed registration.' }, { status: 400 })
  }

  // A pending class request is just a row we can remove; a camp registration is
  // marked cancelled (its history is kept).
  const { error } = kind === 'class'
    ? await admin.from('enrollments').delete().eq('id', id)
    : await admin.from('camp_registrations').update({ status: 'cancelled' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: kind === 'class' ? 'enrollment.request_cancelled' : 'camp_registration.request_cancelled',
    targetTable: table,
    targetId: id,
    metadata: { source: 'parent_portal', student_id: row.student_id },
  }, admin)

  return NextResponse.json({ ok: true })
}
