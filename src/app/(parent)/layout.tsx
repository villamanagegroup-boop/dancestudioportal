import Link from 'next/link'
import { Home, Calendar, CreditCard, FileText, Tent, Megaphone, LogOut, UserCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAvailablePortals } from '@/lib/portal-access'
import { getParentPortalSettings } from '@/lib/portal-settings'
import PortalSwitcher from '@/components/PortalSwitcher'
import ViewAsBar from '@/components/portal/ViewAsBar'
import PortalMobileNav from '@/components/portal/PortalMobileNav'
import Logo from '@/components/Logo'

const ALL_NAV = [
  { href: '/portal', icon: Home, iconKey: 'home', label: 'Home' },
  { href: '/portal/classes', icon: Calendar, iconKey: 'classes', label: 'Classes' },
  { href: '/portal/camps', icon: Tent, iconKey: 'camps', label: 'Camps' },
  { href: '/portal/events', icon: Sparkles, iconKey: 'events', label: 'Events' },
  { href: '/portal/billing', icon: CreditCard, iconKey: 'billing', label: 'Billing' },
  { href: '/portal/documents', icon: FileText, iconKey: 'documents', label: 'Documents' },
  { href: '/portal/policies', icon: ShieldCheck, iconKey: 'policies', label: 'Policies' },
  { href: '/portal/announcements', icon: Megaphone, iconKey: 'news', label: 'News' },
  { href: '/portal/account', icon: UserCircle, iconKey: 'account', label: 'Account' },
]

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getPortalViewer('g')

  let people: { id: string; label: string }[] = []
  if (viewer.canPreview) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'parent')
      .order('last_name')
    people = (data ?? []).map(p => ({
      id: p.id,
      label: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email,
    }))
  }

  const switcherRole = viewer.canPreview ? 'admin' : viewer.role ?? 'parent'
  const available = await getAvailablePortals(viewer.realUserId, switcherRole)

  // Hide portal sections the studio has switched off in Settings → Parent Portal.
  const settings = await getParentPortalSettings()
  const navItems = ALL_NAV.filter(item =>
    (item.href !== '/portal/classes' || settings.show_classes) &&
    (item.href !== '/portal/camps' || settings.show_camps),
  )

  return (
    <div className="min-h-screen">
      {viewer.canPreview && (
        <ViewAsBar kind="g" people={people} currentId={viewer.effectiveId} />
      )}
      <header className="glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size={28} rounded={8} />
            <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">Capital Core</span>
          </div>
          <nav className="hidden lg:flex flex-1 flex-nowrap items-center justify-center gap-0.5 xl:gap-1.5 px-3">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-sm text-gray-600 whitespace-nowrap hover:text-gray-900 hover:bg-gray-100 transition-colors">
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 flex-shrink-0">
            <PortalSwitcher available={available} current="parent" />
            <Link href="/login" className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap">
              <LogOut size={15} />
              <span>Sign out</span>
            </Link>
            <PortalMobileNav
              items={[
                ...navItems.map(({ href, label, iconKey }) => ({ href, label, icon: iconKey })),
                { href: '/login', icon: 'signout', label: 'Sign out' },
              ]}
              title="Capital Core"
            />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="glass glass-page">
          {children}
        </div>
      </main>
    </div>
  )
}
