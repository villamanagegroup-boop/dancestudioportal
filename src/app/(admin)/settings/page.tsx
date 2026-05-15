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
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
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
      </div>
    </div>
  )
}
