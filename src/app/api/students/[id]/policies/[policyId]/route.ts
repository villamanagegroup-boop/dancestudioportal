import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; policyId: string }> }) {
  const { id, policyId } = await params
  const { accept } = await req.json()
  const supabase = createAdminClient()

  const { data: policy } = await supabase.from('policies').select('version').eq('id', policyId).single()
  if (!policy) return NextResponse.json({ error: 'policy not found' }, { status: 404 })

  if (accept) {
    const { error } = await supabase.from('student_policy_acceptances').upsert({
      student_id: id,
      policy_id: policyId,
      policy_version: policy.version,
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'student_id,policy_id,policy_version' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('student_activity_log').insert({
      student_id: id,
      action: 'policy_accepted',
      meta: { policy_id: policyId, version: policy.version },
    })
  } else {
    const { error } = await supabase
      .from('student_policy_acceptances')
      .delete()
      .eq('student_id', id)
      .eq('policy_id', policyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('student_activity_log').insert({
      student_id: id,
      action: 'policy_acceptance_reset',
      meta: { policy_id: policyId },
    })
  }

  return NextResponse.json({ ok: true })
}
