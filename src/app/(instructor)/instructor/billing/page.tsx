import { redirect } from 'next/navigation'
import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function InstructorBillingPage() {
  const viewer = await getPortalViewer('i')
  if (!viewer.realUserId && !viewer.canPreview) redirect('/login')
  const instructorId = viewer.effectiveId

  const admin = createAdminClient()
  const { data: instructor } = instructorId
    ? await admin.from('instructors')
        .select('first_name, last_name, pay_rate, pay_type')
        .eq('id', instructorId).maybeSingle()
    : { data: null }

  const { data: classes } = instructorId
    ? await admin.from('classes')
        .select('id, name, day_of_week, start_time, end_time')
        .eq('instructor_id', instructorId).eq('active', true)
        .order('day_of_week')
    : { data: [] }

  const classList = classes ?? []
  const rate = instructor?.pay_rate ?? null
  const payType = instructor?.pay_type ?? 'hourly'

  // Rough weekly hours from class durations (HH:MM:SS).
  function durationHours(start: string, end: string) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  }
  const weeklyHours = classList.reduce((s, c: any) =>
    s + durationHours(c.start_time, c.end_time), 0)
  const estWeeklyPay = rate != null && payType === 'hourly' ? rate * weeklyHours : null

  return (
    <div className="flex flex-col h-full">
      <Header title="Pay & Earnings" subtitle="Your rate, classes, and estimated pay" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full" style={{ paddingTop: 16 }}>
          <div className="glass glass-page">
            <KpiStrip
              items={[
                { label: 'Pay rate', value: rate != null ? `${formatCurrency(rate)} / ${payType.replace('_', ' ')}` : 'Not set' },
                { label: 'Active classes', value: String(classList.length) },
                { label: 'Weekly hours (est.)', value: weeklyHours.toFixed(1) },
                ...(estWeeklyPay != null ? [{ label: 'Est. weekly pay', value: formatCurrency(estWeeklyPay) }] : []),
              ]}
            />

            <hr className="section-rule" />
            <SectionHead label="Your classes" />
            {classList.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No active classes assigned.</p>
            ) : (
              <div className="tight-list">
                {classList.map((c: any) => (
                  <div key={c.id} className="tl-row no-lead">
                    <div className="tl-main">
                      <div className="t">{c.name}</div>
                      <div className="s" style={{ textTransform: 'capitalize' }}>
                        {c.day_of_week} · {durationHours(c.start_time, c.end_time).toFixed(1)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 16 }}>
              Estimates are based on scheduled class durations. Detailed hours logging and pay
              statements are coming soon. Questions about your pay? Contact the studio admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
