import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Parent-facing: the signed-in guardian accepts or denies a policy for themselves.
// Body: { action: 'accept' | 'deny', reason?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = await params
  const { effectiveId } = await getPortalViewer('g')
  if (!effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action: 'accept' | 'deny' = body.action === 'deny' ? 'deny' : 'accept'
  const reason: string | null = typeof body.reason === 'string' ? body.reason.trim() : null

  if (action === 'deny' && !reason) {
    return NextResponse.json({ error: 'Please add a brief reason so the studio can review.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: policy } = await admin.from('policies').select('version, active').eq('id', policyId).single()
  if (!policy || !policy.active) return NextResponse.json({ error: 'policy not found' }, { status: 404 })

  const accepted = action === 'accept'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  const { error } = await admin.from('policy_acceptances').upsert({
    guardian_id: effectiveId,
    policy_id: policyId,
    policy_version: policy.version,
    status: accepted ? 'accepted' : 'denied',
    denial_reason: accepted ? null : reason,
    accepted_at: new Date().toISOString(),
    ip_address: ip,
  }, { onConflict: 'guardian_id,policy_id,policy_version' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('family_activity_log').insert({
    guardian_id: effectiveId,
    action: accepted ? 'policy_accepted' : 'policy_denied',
    meta: { policy_id: policyId, version: policy.version, reason: accepted ? undefined : reason, source: 'portal' },
  })

  return NextResponse.json({ ok: true })
}
