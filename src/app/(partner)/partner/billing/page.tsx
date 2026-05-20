import { redirect } from 'next/navigation'
import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function PartnerBillingPage() {
  const viewer = await getPortalViewer('p')
  if (!viewer.realUserId && !viewer.canPreview) redirect('/login')
  const partnerId = viewer.effectiveId

  const admin = createAdminClient()
  const { data: partner } = partnerId
    ? await admin.from('partners')
        .select('name, rate_amount, rate_unit')
        .eq('id', partnerId).maybeSingle()
    : { data: null }

  const { data: bookings } = partnerId
    ? await admin.from('bookings')
        .select('id, title, booking_date, start_time, end_time, price, status')
        .eq('partner_id', partnerId)
        .order('booking_date', { ascending: false })
        .limit(100)
    : { data: [] }

  const list = bookings ?? []
  const total = list.reduce((s, b: any) => s + Number(b.price ?? 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = list.filter((b: any) => b.booking_date >= today)
  const past = list.filter((b: any) => b.booking_date < today)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Billing</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Earnings &amp; bookings</h1>
        {partner?.rate_amount != null && (
          <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            Your rate: {formatCurrency(Number(partner.rate_amount))} / {partner.rate_unit}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <Stat label="Total bookings" value={String(list.length)} />
        <Stat label="Upcoming" value={String(upcoming.length)} />
        <Stat label="Total value" value={formatCurrency(total)} />
      </div>

      <Section title="Upcoming">
        <BookingList rows={upcoming} empty="No upcoming bookings." />
      </Section>
      <Section title="Past">
        <BookingList rows={past} empty="No past bookings." />
      </Section>

      <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
        Booking values are what the studio has recorded. Questions about payment? Contact the studio admin.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700 }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

function BookingList({ rows, empty }: { rows: any[]; empty: string }) {
  if (rows.length === 0) return <p style={{ fontSize: 14, color: '#999' }}>{empty}</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(b => (
        <div key={b.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{b.title}</p>
            <p style={{ fontSize: 12, color: '#666' }}>{formatDate(b.booking_date)} · {b.status}</p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(Number(b.price ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}
