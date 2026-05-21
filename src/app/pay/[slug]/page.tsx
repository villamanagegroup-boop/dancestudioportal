import { createAdminClient } from '@/lib/supabase/admin'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getStudioName(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('studio_settings').select('value').eq('key', 'studio_profile').maybeSingle()
  return (data?.value as any)?.name ?? 'Capital Core Dance Studio'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: link } = await admin.from('checkout_links').select('title').eq('slug', slug).maybeSingle()
  return { title: link ? `Pay · ${link.title}` : 'Payment' }
}

export default async function PayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const [{ data: link }, studioName] = await Promise.all([
    admin.from('checkout_links').select('*').eq('slug', slug).maybeSingle(),
    getStudioName(admin),
  ])

  const inactive = link && !link.active

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Branded header */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={studioName} width={72} height={72}
            style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{studioName}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Secure checkout</p>
        </div>

        <div style={{
          background: 'var(--bg-2, #fff)', borderRadius: 20, padding: 24,
          border: '1px solid var(--line, #ececf5)', boxShadow: '0 20px 60px -20px rgba(10,12,40,0.25)',
        }}>
          {!link || inactive ? (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 8 }}>
                {inactive ? 'This payment link is closed' : 'Payment link not found'}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
                Please check the link or contact {studioName}.
              </p>
            </div>
          ) : (
            <CheckoutForm
              slug={link.slug}
              studioName={studioName}
              title={link.title}
              description={link.description}
              lineItems={(link.line_items as any) ?? []}
              fixedAmount={link.amount != null ? Number(link.amount) : null}
              allowCustomAmount={link.allow_custom_amount}
              minAmount={link.min_amount != null ? Number(link.min_amount) : null}
              suggestedAmounts={((link.suggested_amounts as any) ?? []).map(Number)}
              collectContact={link.collect_contact}
              requireContact={link.require_contact}
              thankYouMessage={link.thank_you_message}
            />
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', marginTop: 14 }}>
          Payments processed securely by PayPal.
        </p>
      </div>
    </div>
  )
}
