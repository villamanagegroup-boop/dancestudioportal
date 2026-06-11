import { getPortalViewer } from '@/lib/portal-viewer'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/portal/event-request — a parent asks to book a party or studio
// event. Lands in the admin Intake inbox (site_intake) and pings the bell.
export async function POST(req: NextRequest) {
  const viewer = await getPortalViewer('g')
  const guardianId = viewer.effectiveId
  if (!guardianId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const requestType = body.request_type === 'event' ? 'event' : body.request_type === 'other' ? 'other' : 'party'
  const preferredDate = typeof body.preferred_date === 'string' ? body.preferred_date.trim() : ''
  const guestCount = body.guest_count != null && body.guest_count !== '' ? Number(body.guest_count) : null
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message && !preferredDate) {
    return NextResponse.json({ error: 'Add a preferred date or a few details.' }, { status: 400 })
  }

  const { data: guardian } = await viewer.db
    .from('profiles').select('first_name, last_name, email, phone').eq('id', guardianId).maybeSingle()
  const name = guardian ? `${guardian.first_name ?? ''} ${guardian.last_name ?? ''}`.trim() || null : null

  const sourceForm = requestType === 'party' ? 'birthday' : 'event_request'
  const { data, error } = await viewer.db
    .from('site_intake')
    .insert({
      source_form: sourceForm,
      source_table: 'portal_event_request',
      submitter_email: guardian?.email ?? null,
      submitter_name: name,
      payload: {
        request_type: requestType,
        preferred_date: preferredDate || null,
        guest_count: Number.isFinite(guestCount as number) ? guestCount : null,
        message: message || null,
        phone: guardian?.phone ?? null,
        guardian_id: guardianId,
      },
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const label = requestType === 'party' ? 'Party request' : requestType === 'event' ? 'Event request' : 'Booking request'
  await logActivity({
    action: 'intake.received',
    targetTable: 'site_intake',
    targetId: data.id,
    targetLabel: name,
    metadata: { source_form: sourceForm, request_type: requestType },
  }, viewer.db)

  await notify({
    type: 'intake.received',
    title: `New ${label.toLowerCase()}`,
    body: name ? `${name}${preferredDate ? ` · ${preferredDate}` : ''}` : label,
    href: '/intake',
    metadata: { intake_id: data.id, request_type: requestType },
  }, viewer.db)

  return NextResponse.json({ ok: true }, { status: 201 })
}
