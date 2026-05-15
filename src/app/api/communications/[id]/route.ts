import { createAdminClient } from '@/lib/supabase/admin'
import { sendStudioAnnouncement } from '@/lib/resend'
import { resolveRecipients } from '@/lib/communications'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: communication, error } = await supabase
    .from('communications')
    .select(`
      *,
      sender:profiles!communications_sender_id_fkey(first_name, last_name),
      target_class:classes(name),
      target_guardian:profiles!communications_target_guardian_id_fkey(first_name, last_name, email),
      target_instructor:instructors(first_name, last_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !communication) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  const { data: recipients } = await supabase
    .from('communication_recipients')
    .select('id, delivered_at, opened_at, error, guardian:profiles(first_name, last_name, email)')
    .eq('communication_id', id)

  return NextResponse.json({ communication, recipients: recipients ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action } = await req.json()
  const supabase = createAdminClient()

  if (action !== 'send_now') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data: comm } = await supabase.from('communications').select('*').eq('id', id).single()
  if (!comm) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (comm.sent_at) return NextResponse.json({ error: 'Message has already been sent' }, { status: 400 })

  const recipients = await resolveRecipients(supabase, {
    target_type: comm.target_type,
    target_class_id: comm.target_class_id,
    target_guardian_id: comm.target_guardian_id,
    target_instructor_id: comm.target_instructor_id,
  })
  const now = new Date().toISOString()

  await supabase.from('communication_recipients').delete().eq('communication_id', id)
  const guardianRecipients = recipients.filter(r => r.guardianId)
  if (guardianRecipients.length > 0) {
    await supabase.from('communication_recipients').insert(
      guardianRecipients.map(r => ({
        communication_id: id,
        guardian_id: r.guardianId,
        delivered_at: now,
      })),
    )
  }

  let emailsSent = 0
  if (comm.comm_type === 'email' || comm.comm_type === 'reminder') {
    const results = await Promise.allSettled(
      recipients.map(r =>
        sendStudioAnnouncement({
          to: r.email,
          subject: comm.subject || 'A message from Capital Core Dance Studio',
          body: comm.body,
        }),
      ),
    )
    emailsSent = results.filter(r => r.status === 'fulfilled').length
  }

  const { error } = await supabase
    .from('communications')
    .update({ sent_at: now, scheduled_for: null, recipient_count: recipients.length })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, recipientCount: recipients.length, emailsSent })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('communications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
