import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'

// POST /api/contact — public contact form from the login screen. Lands in the
// admin Intake inbox (site_intake) and pings the notification bell. No auth.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and a message are required.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('site_intake')
    .insert({
      source_form: 'contact',
      source_table: 'contact_form',
      submitter_email: email,
      submitter_name: name,
      payload: { name, email, phone: phone || null, subject: subject || null, message },
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'intake.received',
    targetTable: 'site_intake',
    targetId: data.id,
    targetLabel: name,
    metadata: { source_form: 'contact', subject: subject || null },
    system: true,
  }, admin)

  await notify({
    type: 'intake.received',
    title: 'New contact message',
    body: subject ? `${name} · ${subject}` : `${name} sent a message`,
    href: '/intake',
    metadata: { intake_id: data.id, source_form: 'contact' },
  }, admin)

  return NextResponse.json({ ok: true }, { status: 201 })
}
