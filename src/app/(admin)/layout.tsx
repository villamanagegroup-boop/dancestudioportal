import Sidebar from '@/components/admin/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAvailablePortals } from '@/lib/portal-access'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let role = 'admin'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    role = profile?.role ?? 'admin'
  }
  const available = await getAvailablePortals(user?.id ?? null, role)

  return (
    <div className="admin-shell flex h-screen">
      <div className="admin-header-bar" aria-hidden="true" />
      <Sidebar role={role} available={available} />
      <div className="flex-1 flex flex-col overflow-hidden admin-content">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
