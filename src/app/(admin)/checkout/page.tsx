import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CheckoutManager from '@/components/admin/CheckoutManager'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const supabase = createAdminClient()

  const [{ data: links }, { data: payments }, { data: contacts }, { data: profileRow }] = await Promise.all([
    supabase.from('checkout_links').select('*').order('created_at', { ascending: false }),
    supabase.from('checkout_payments').select('id, description, amount, source, created_at, paypal_capture_id').order('created_at', { ascending: false }).limit(100),
    supabase.from('checkout_contacts').select('id, name, email, phone, marketing_opt_in, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('studio_settings').select('value').eq('key', 'studio_profile').maybeSingle(),
  ])

  const studioName = (profileRow?.value as any)?.name ?? 'Capital Core Dance Studio'

  return (
    <div className="flex flex-col h-full">
      <Header title="Checkout" subtitle="Take payments and create branded payment links" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <CheckoutManager
              links={(links as any) ?? []}
              payments={(payments as any) ?? []}
              contacts={(contacts as any) ?? []}
              studioName={studioName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
