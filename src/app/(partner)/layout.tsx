import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAvailablePortals } from '@/lib/portal-access'
import PortalSwitcher from '@/components/PortalSwitcher'
import ViewAsBar from '@/components/portal/ViewAsBar'
import SignOutButton from '@/components/portal/SignOutButton'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getPortalViewer('p')
  if (!viewer.realUserId && !viewer.canPreview) redirect('/login')

  const admin = createAdminClient()

  let people: { id: string; label: string }[] = []
  if (viewer.canPreview) {
    const { data } = await admin
      .from('partners')
      .select('id, name, contact_name')
      .order('name')
    people = (data ?? []).map(p => ({
      id: p.id,
      label: p.contact_name ? `${p.name} (${p.contact_name})` : p.name,
    }))
  }

  const { data: partner } = viewer.effectiveId
    ? await admin
        .from('partners')
        .select('name, partner_type')
        .eq('id', viewer.effectiveId)
        .maybeSingle()
    : { data: null }

  const switcherRole = viewer.canPreview ? 'admin' : viewer.role ?? 'partner'
  const available = await getAvailablePortals(viewer.realUserId, switcherRole)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1, #fafafa)' }}>
      {viewer.canPreview && (
        <ViewAsBar kind="p" people={people} currentId={viewer.effectiveId} />
      )}
      <header style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link href="/partner/dashboard" className="block">
              <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Partner portal
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                {partner?.name ?? 'Capital Core Dance Studio'}
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <PortalSwitcher available={available} current="partner" />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
