import { getPortalViewer } from '@/lib/portal-viewer'
import PortalPoliciesList from '@/components/portal/PortalPoliciesList'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export const dynamic = 'force-dynamic'

export default async function ParentPoliciesPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const [{ data: policies }, { data: responses }] = await Promise.all([
    db.from('policies').select('id, name, body, required, version, category, sort_order')
      .eq('active', true).order('sort_order').order('name'),
    db.from('policy_acceptances').select('policy_id, status, policy_version, denial_reason, accepted_at')
      .eq('guardian_id', gid),
  ])

  const respByPolicy = new Map((responses ?? []).map(r => [r.policy_id, r]))
  const items = (policies ?? []).map(p => ({
    ...p,
    response: respByPolicy.get(p.id) ?? null,
  }))

  const pendingRequired = items.filter(p =>
    p.required && (!p.response || p.response.status !== 'accepted' || p.response.policy_version !== p.version),
  ).length

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Policies</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Studio policies & agreements.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {pendingRequired === 0
            ? 'All required policies are on file. Thank you!'
            : `${pendingRequired} required ${pendingRequired === 1 ? 'policy needs' : 'policies need'} your response.`}
        </p>
      </div>

      <PortalPoliciesList items={items as any} />
    </div>
  )
}
