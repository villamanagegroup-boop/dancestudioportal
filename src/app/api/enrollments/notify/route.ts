import { createAdminClient } from '@/lib/supabase/admin'
import { sendStudioAnnouncement } from '@/lib/resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { enrollmentIds, subject, body, channel } = await req.json()

  if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
    return NextResponse.json({ error: 'No enrollments selected' }, { status: 400 })
  }
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }
  const ch = channel === 'portal' ? 'portal' : 'email'
  const subjectLine = subject?.trim() || 'A message from Capital Core Dance Studio'

  const supabase = createAdminClient()

  const { data: rows, error: rowsErr } = await supabase
    .from('enrollments')
    .select('id, student:students(guardian_students(guardian:profiles(email)))')
    .in('id', enrollmentIds)
  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

  let recipientCount = 0

  if (ch === 'email') {
    const emails = new Set<string>()
    for (const row of rows ?? []) {
      const student = row.student as any
      for (const gs of student?.guardian_students ?? []) {
        const email = gs?.guardian?.email
        if (email) emails.add(email)
      }
    }
    if (emails.size === 0) {
      return NextResponse.json({ error: 'No guardian emails found for the selected enrollments' }, { status: 400 })
    }
    const results = await Promise.allSettled(
      [...emails].map(email => sendStudioAnnouncement({ to: email, subject: subjectLine, body })),
    )
    recipientCount = results.filter(r => r.status === 'fulfilled').length
    if (recipientCount === 0) {
      return NextResponse.json({ error: 'Failed to send to any recipients' }, { status: 502 })
    }
  } else {
    recipientCount = (rows ?? []).length
  }

  const { error } = await supabase.from('communications').insert({
    subject: subjectLine,
    body,
    comm_type: ch === 'email' ? 'email' : 'announcement',
    target_all: false,
    sent_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, channel: ch, recipientCount })
}
