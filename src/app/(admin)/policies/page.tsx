import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import PoliciesManager from '@/components/admin/PoliciesManager'

export const dynamic = 'force-dynamic'

export default async function PoliciesAdminPage() {
  const supabase = createAdminClient()

  const [{ data: policies }, { data: acceptances }, { count: familyCount }] = await Promise.all([
    supabase.from('policies').select('*').order('sort_order').order('name'),
    supabase.from('policy_acceptances').select('policy_id, status, policy_version'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent').eq('active', true),
  ])

  const totalFamilies = familyCount ?? 0

  // Per-policy response stats against the policy's *current* version.
  const withStats = (policies ?? []).map(p => {
    const rows = (acceptances ?? []).filter(a => a.policy_id === p.id)
    const acceptedCurrent = rows.filter(a => a.status === 'accepted' && a.policy_version === p.version).length
    const denied = rows.filter(a => a.status === 'denied').length
    const responded = rows.filter(a => a.policy_version === p.version).length
    const pending = Math.max(0, totalFamilies - responded)
    return { ...p, stats: { accepted: acceptedCurrent, denied, pending } }
  })

  return (
    <div className="flex flex-col h-full">
      <Header title="Policies" subtitle="Studio policies, waivers & agreements" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <PoliciesManager policies={withStats as any} totalFamilies={totalFamilies} />
        </div>
      </div>
    </div>
  )
}
