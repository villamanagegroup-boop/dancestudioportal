import { createAdminClient } from '@/lib/supabase/admin'
import { sendStudioAnnouncement } from '@/lib/resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campId } = await params
  const { channel, subject, body } = await req.json()

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }
  if (channel === 'sms') {
    return NextResponse.json(
      { error: 'SMS is not configured yet. Add a provider (e.g. Twilio) to enable it.' },
      { status: 501 },
    )
  }
  if (channel !== 'email' && channel !== 'portal') {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: camp } = await supabase.from('camps').select('name').eq('id', campId).single()
  const campName = camp?.name ?? 'the camp'
  const subjectLine = subject?.trim() || `Update — ${campName}`

  let recipientCount = 0

  if (channel === 'email') {
    const { data: rows } = await supabase
      .from('camp_registrations')
      .select('student:students(guardian_students(guardian:profiles(email)))')
      .eq('camp_id', campId)
      .eq('status', 'registered')

    const emails = new Set<string>()
    for (const row of rows ?? []) {
      const student = row.student as any
      for (const gs of student?.guardian_students ?? []) {
        const email = gs?.guardian?.email
        if (email) emails.add(email)
      }
    }

    const results = await Promise.allSettled(
      [...emails].map(email => sendStudioAnnouncement({ to: email, subject: subjectLine, body })),
    )
    recipientCount = results.filter(r => r.status === 'fulfilled').length

    if (recipientCount === 0 && emails.size > 0) {
      return NextResponse.json({ error: 'Failed to send to any recipients' }, { status: 502 })
    }
  }

  const { error } = await supabase.from('communications').insert({
    subject: subjectLine,
    body,
    comm_type: channel === 'email' ? 'email' : 'announcement',
    target_all: false,
    sent_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, channel, recipientCount })
}
