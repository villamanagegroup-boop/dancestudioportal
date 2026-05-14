import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { subject, body, useSecondary } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'subject and body required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, secondary_email, email_opt_in, first_name, last_name')
    .eq('id', id)
    .single()
  if (!profile) return NextResponse.json({ error: 'family not found' }, { status: 404 })

  const to = useSecondary && profile.secondary_email ? profile.secondary_email : profile.email
  if (!to) return NextResponse.json({ error: 'no email on file' }, { status: 400 })
  if (!profile.email_opt_in) {
    return NextResponse.json({ error: 'family has opted out of email' }, { status: 400 })
  }

  // Persist as a one-off broadcast so it shows up in the broadcasts list too
  const { data: comm } = await supabase
    .from('communications')
    .insert({
      subject,
      body,
      comm_type: 'email',
      target_all: false,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (comm) {
    await supabase.from('communication_recipients').insert({
      communication_id: comm.id,
      guardian_id: id,
      delivered_at: null,
    })
  }

  // Mirror into the per-family touchpoint log
  await supabase.from('family_communication_log').insert({
    guardian_id: id,
    direction: 'outbound',
    channel: 'email',
    subject,
    body,
  })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'email_sent',
    meta: { subject, to },
  })

  // Try Resend if configured; otherwise the log entries above are still kept
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (apiKey && from) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const { error } = await resend.emails.send({
        from, to, subject,
        html: body.replace(/\n/g, '<br/>'),
      })
      if (error) {
        return NextResponse.json({ ok: true, warning: `logged but Resend error: ${error.message}` })
      }
      if (comm) {
        await supabase.from('communication_recipients')
          .update({ delivered_at: new Date().toISOString() })
          .eq('communication_id', comm.id)
          .eq('guardian_id', id)
      }
    } catch (e: any) {
      return NextResponse.json({ ok: true, warning: `logged but send failed: ${e.message}` })
    }
  } else {
    return NextResponse.json({ ok: true, warning: 'logged only — RESEND_API_KEY not configured' })
  }

  return NextResponse.json({ ok: true })
}
