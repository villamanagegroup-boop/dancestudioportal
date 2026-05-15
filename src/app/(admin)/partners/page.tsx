import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import PartnersManager from '@/components/admin/PartnersManager'

export default async function PartnersPage() {
  const supabase = createAdminClient()
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('name')

  return (
    <div className="flex flex-col h-full">
      <Header title="Partners" subtitle="Studio partnerships, local businesses, vendors, and venues" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <PartnersManager partners={(partners ?? []) as any} />
          </div>
        </div>
      </div>
    </div>
  )
}
