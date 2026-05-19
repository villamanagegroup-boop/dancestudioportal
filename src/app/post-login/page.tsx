import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service-role client for the routing lookup so RLS can't mask the role.
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single()

  if (params.debug === '1') {
    return (
      <pre style={{ padding: 24, fontSize: 12, background: '#f5f5f5', color: '#000', overflow: 'auto' }}>
        {JSON.stringify(
          {
            userId: user.id,
            userEmail: user.email,
            profile,
            error: error?.message ?? null,
          },
          null,
          2
        )}
      </pre>
    )
  }

  if (profile?.role === 'admin') redirect('/dashboard')
  if (profile?.role === 'instructor') redirect('/instructor/dashboard')
  if (profile?.role === 'partner') redirect('/partner/dashboard')
  redirect('/portal')
}
