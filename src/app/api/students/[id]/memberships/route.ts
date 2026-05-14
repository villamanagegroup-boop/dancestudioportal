import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { tier, starts_on, ends_on, notes } = await req.json()
  if (!tier?.trim() || !starts_on) {
    return NextResponse.json({ error: 'tier and starts_on required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_memberships')
    .insert({
      student_id: id,
      tier: tier.trim(),
      starts_on,
      ends_on: ends_on || null,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: 'membership_added',
    meta: { membership_id: data.id, tier },
  })

  return NextResponse.json({ ok: true, membership_id: data.id })
}
