import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

export default async function PartnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, partner_type, contact_name, email, phone, website, rate_amount, rate_unit, active')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!partner) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome</h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          Your partner record isn't set up yet. Reach out to the studio to get this configured.
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: upcoming } = await admin
    .from('bookings')
    .select('id, title, booking_date, start_time, end_time, booking_type, status, notes, room:rooms(name)')
    .eq('partner_id', partner.id)
    .gte('booking_date', today)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(20)

  const { data: pastCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partner.id)
    .lt('booking_date', today)

  const upcomingList = upcoming ?? []
  const pastTotal = (pastCount as any)?.count ?? 0

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Welcome back
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          {partner.name}
        </h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          {upcomingList.length > 0
            ? `You have ${upcomingList.length} upcoming booking${upcomingList.length === 1 ? '' : 's'} at the studio.`
            : 'No upcoming bookings on the calendar.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <Stat label="Upcoming bookings" value={String(upcomingList.length)} />
        <Stat label="Past bookings" value={String(pastTotal)} />
        <Stat label="Status" value={partner.active ? 'Active' : 'Inactive'} />
      </div>

      <Section title="Upcoming bookings">
        {upcomingList.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999' }}>Nothing scheduled.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingList.map(b => {
              const roomName = (Array.isArray(b.room) ? b.room[0]?.name : (b.room as any)?.name) ?? null
              return (
              <div key={b.id} style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{b.title}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>
                    {formatDate(b.booking_date)} · {formatTime(b.start_time)}–{formatTime(b.end_time)}
                    {roomName && ` · ${roomName}`}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4,
                  background: b.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                  color: b.status === 'confirmed' ? '#166534' : '#92400e',
                }}>
                  {b.status}
                </span>
              </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Your business">
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
          <DataRow label="Business name" value={partner.name} />
          <DataRow label="Type" value={partner.partner_type} />
          <DataRow label="Primary contact" value={partner.contact_name ?? '—'} />
          <DataRow label="Email" value={partner.email ?? '—'} />
          <DataRow label="Phone" value={partner.phone ?? '—'} />
          <DataRow label="Website" value={partner.website ?? '—'} />
          {partner.rate_amount != null && (
            <DataRow label="Rate" value={`$${partner.rate_amount} / ${partner.rate_unit}`} />
          )}
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          Need to update something? Contact the studio admin.
        </p>
      </Section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{value}</span>
    </div>
  )
}
