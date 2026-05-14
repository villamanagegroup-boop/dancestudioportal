import { createAdminClient } from '@/lib/supabase/admin'
import { sendStudioAnnouncement } from '@/lib/resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: partyId } = await params
  const { subject, body } = await req.json()

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: party } = await supabase
    .from('parties')
    .select('contact_name, contact_email')
    .eq('id', partyId)
    .single()

  if (!party) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (!party.contact_email) {
    return NextResponse.json({ error: 'This event has no contact email on file' }, { status: 400 })
  }

  const subjectLine = subject?.trim() || 'A message from Capital Core Dance Studio'

  try {
    await sendStudioAnnouncement({ to: party.contact_email, subject: subjectLine, body })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed to send email' }, { status: 502 })
  }

  // Log it to communications for a paper trail
  await supabase.from('communications').insert({
    subject: subjectLine,
    body,
    comm_type: 'email',
    target_all: false,
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, sentTo: party.contact_email })
}
