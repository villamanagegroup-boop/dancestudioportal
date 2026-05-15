import { createAdminClient } from '@/lib/supabase/admin'
import { sendStudioAnnouncement } from '@/lib/resend'
import { resolveRecipients, VALID_TARGETS } from '@/lib/communications'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    comm_type = 'email',
    subject,
    body: messageBody,
    target_type = 'all_families',
    target_class_id,
    target_guardian_id,
    target_instructor_id,
    scheduled_for,
  } = body

  if (!messageBody?.trim()) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 })
  }
  if (!VALID_TARGETS.includes(target_type)) {
    return NextResponse.json({ error: 'Invalid recipient group.' }, { status: 400 })
  }
  if (comm_type === 'sms') {
    return NextResponse.json(
      { error: 'SMS is not configured yet. Add a provider (e.g. Twilio) to enable it.' },
      { status: 501 },
    )
  }
  if (target_type === 'class' && !target_class_id) {
    return NextResponse.json({ error: 'Select a class.' }, { status: 400 })
  }
  if (target_type === 'family' && !target_guardian_id) {
    return NextResponse.json({ error: 'Select a family.' }, { status: 400 })
  }
  if (target_type === 'staff_member' && !target_instructor_id) {
    return NextResponse.json({ error: 'Select a staff member.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const recipients = await resolveRecipients(supabase, {
    target_type, target_class_id, target_guardian_id, target_instructor_id,
  })

  const isScheduled = !!scheduled_for && new Date(scheduled_for) > new Date()
  const now = new Date().toISOString()

  const { data: comm, error: insErr } = await supabase
    .from('communications')
    .insert({
      subject: subject?.trim() || null,
      body: messageBody,
      comm_type,
      target_type,
      target_all: target_type === 'all_families' || target_type === 'everyone',
      target_class_id: target_type === 'class' ? target_class_id : null,
      target_guardian_id: target_type === 'family' ? target_guardian_id : null,
      target_instructor_id: target_type === 'staff_member' ? target_instructor_id : null,
      scheduled_for: isScheduled ? scheduled_for : null,
      sent_at: isScheduled ? null : now,
      recipient_count: recipients.length,
    })
    .select('id')
    .single()

  if (insErr || !comm) {
    return NextResponse.json({ error: insErr?.message ?? 'Failed to save message' }, { status: 400 })
  }

  const guardianRecipients = recipients.filter(r => r.guardianId)
  if (guardianRecipients.length > 0) {
    await supabase.from('communication_recipients').insert(
      guardianRecipients.map(r => ({
        communication_id: comm.id,
        guardian_id: r.guardianId,
        delivered_at: isScheduled ? null : now,
      })),
    )
  }

  let emailsSent = 0
  if (!isScheduled && (comm_type === 'email' || comm_type === 'reminder')) {
    const results = await Promise.allSettled(
      recipients.map(r =>
        sendStudioAnnouncement({
          to: r.email,
          subject: subject?.trim() || 'A message from Capital Core Dance Studio',
          body: messageBody,
        }),
      ),
    )
    emailsSent = results.filter(r => r.status === 'fulfilled').length
  }

  return NextResponse.json({
    ok: true,
    id: comm.id,
    recipientCount: recipients.length,
    emailsSent,
    scheduled: isScheduled,
  })
}
