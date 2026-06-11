import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Record a student-level policy response (admin action).
// Body: { action: 'accept' | 'deny' | 'reset', reason?: string }
// Back-compat: { accept: true } => accept, { accept: false } => reset.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; policyId: string }> }) {
  const { id, policyId } = await params
  const body = await req.json().catch(() => ({}))
  const action: 'accept' | 'deny' | 'reset' =
    body.action ?? (body.accept === true ? 'accept' : body.accept === false ? 'reset' : 'accept')
  const reason: string | null = typeof body.reason === 'string' ? body.reason.trim() : null

  const supabase = createAdminClient()

  const { data: policy } = await supabase.from('policies').select('version').eq('id', policyId).single()
  if (!policy) return NextResponse.json({ error: 'policy not found' }, { status: 404 })

  if (action === 'deny' && !reason) {
    return NextResponse.json({ error: 'A reason is required to deny a policy.' }, { status: 400 })
  }

  if (action === 'reset') {
    const { error } = await supabase
      .from('student_policy_acceptances')
      .delete()
      .eq('student_id', id)
      .eq('policy_id', policyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('student_activity_log').insert({
      student_id: id,
      action: 'policy_response_reset',
      meta: { policy_id: policyId },
    })
    return NextResponse.json({ ok: true })
  }

  const accepted = action === 'accept'
  const { error } = await supabase.from('student_policy_acceptances').upsert({
    student_id: id,
    policy_id: policyId,
    policy_version: policy.version,
    status: accepted ? 'accepted' : 'denied',
    denial_reason: accepted ? null : reason,
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'student_id,policy_id,policy_version' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: accepted ? 'policy_accepted' : 'policy_denied',
    meta: { policy_id: policyId, version: policy.version, reason: accepted ? undefined : reason },
  })

  return NextResponse.json({ ok: true })
}
