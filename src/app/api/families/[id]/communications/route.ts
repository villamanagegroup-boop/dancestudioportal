import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CHANNEL = new Set(['email', 'sms', 'phone', 'in_person', 'note'])
const VALID_DIRECTION = new Set(['inbound', 'outbound'])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { direction, channel, subject, body, occurred_at } = await req.json()

  if (!VALID_DIRECTION.has(direction)) return NextResponse.json({ error: 'invalid direction' }, { status: 400 })
  if (!VALID_CHANNEL.has(channel)) return NextResponse.json({ error: 'invalid channel' }, { status: 400 })
  if (!body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('family_communication_log').insert({
    guardian_id: id,
    direction,
    channel,
    subject: subject?.trim() || null,
    body: body.trim(),
    occurred_at: occurred_at || new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'communication_logged',
    meta: { direction, channel },
  })

  return NextResponse.json({ ok: true })
}
