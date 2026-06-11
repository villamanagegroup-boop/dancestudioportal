import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// A family sends a note to the studio (or an instructor). Logged as an inbound
// entry on the family's communication log so staff see it in the family record.
export async function POST(req: NextRequest) {
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { subject, body, to } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Please write a message' }, { status: 400 })

  const audience = to === 'instructor' ? 'instructor' : 'studio'
  const admin = createAdminClient()

  const { error } = await admin.from('family_communication_log').insert({
    guardian_id: effectiveId,
    direction: 'inbound',
    channel: 'note',
    subject: subject?.trim() || (audience === 'instructor' ? 'Message for instructor' : 'Message for the studio'),
    body: body.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('family_activity_log').insert({
    guardian_id: effectiveId,
    action: 'message_sent',
    meta: { to: audience },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
