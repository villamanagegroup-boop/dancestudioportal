import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CommunicationsPanel from '@/components/admin/CommunicationsPanel'

export default async function CommunicationsPage() {
  const supabase = createAdminClient()
  const [{ data: communications }, { data: classes }] = await Promise.all([
    supabase.from('communications').select(`
      *, sender:profiles(first_name, last_name)
    `).order('created_at', { ascending: false }).limit(50),
    supabase.from('classes').select('id, name').eq('active', true),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Communications" subtitle="Send messages to families and staff" />
      <div className="p-6">
        <CommunicationsPanel communications={communications ?? []} classes={classes ?? []} />
      </div>
    </div>
  )
}
