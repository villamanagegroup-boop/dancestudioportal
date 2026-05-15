import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import SettingsPanel from '@/components/admin/SettingsPanel'

export default async function SettingsPage() {
  const supabase = createAdminClient()
  const [
    { data: seasons },
    { data: rooms },
    { data: classTypes },
    { data: studioHours },
    { data: settingsRows },
    { data: taxRates },
    { data: chargeCategories },
  ] = await Promise.all([
    supabase.from('seasons').select('*').order('start_date', { ascending: false }),
    supabase.from('rooms').select('*').order('name'),
    supabase.from('class_types').select('*').order('name'),
    supabase.from('studio_hours').select('*'),
    supabase.from('studio_settings').select('key, value'),
    supabase.from('tax_rates').select('*').order('name'),
    supabase.from('charge_categories').select('*').order('name'),
  ])

  const settings: Record<string, any> = {}
  for (const row of settingsRows ?? []) settings[row.key] = row.value

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Studio configuration, portals, and finance" />
      <div className="p-6 overflow-y-auto">
        <SettingsPanel
          seasons={seasons ?? []}
          rooms={rooms ?? []}
          classTypes={classTypes ?? []}
          studioHours={studioHours ?? []}
          settings={settings}
          taxRates={taxRates ?? []}
          chargeCategories={chargeCategories ?? []}
        />
      </div>
    </div>
  )
}
