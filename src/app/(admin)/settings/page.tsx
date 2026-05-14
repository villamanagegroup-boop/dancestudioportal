import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import SettingsPanel from '@/components/admin/SettingsPanel'

export default async function SettingsPage() {
  const supabase = createAdminClient()
  const [{ data: seasons }, { data: rooms }, { data: classTypes }] = await Promise.all([
    supabase.from('seasons').select('*').order('start_date', { ascending: false }),
    supabase.from('rooms').select('*').order('name'),
    supabase.from('class_types').select('*').order('name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Studio configuration and preferences" />
      <div className="p-6">
        <SettingsPanel
          seasons={seasons ?? []}
          rooms={rooms ?? []}
          classTypes={classTypes ?? []}
        />
      </div>
    </div>
  )
}
