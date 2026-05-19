import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/portal/SignOutButton'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, partner_type')
    .eq('profile_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1, #fafafa)' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/partner/dashboard" className="block">
              <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Partner portal
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                {partner?.name ?? 'Capital Core Dance Studio'}
              </p>
            </Link>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
