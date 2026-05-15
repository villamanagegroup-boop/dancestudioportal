import { getPortalViewer } from '@/lib/portal-viewer'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  PERMISSION_CATALOG, ROLE_LABELS, ROLE_DESCRIPTIONS, getPermission, isStaffRole,
  type PermLevel,
} from '@/lib/permissions'
import Header from '@/components/admin/Header'
import KpiStrip from '@/components/admin/KpiStrip'
import SectionHead from '@/components/admin/SectionHead'
import InstructorProfileForm from '@/components/portal/InstructorProfileForm'
import InstructorHoursLog from '@/components/portal/InstructorHoursLog'

const LEVEL_TAG: Record<PermLevel, string> = {
  none: 'tag tag-pink',
  view: 'tag tag-blue',
  full: 'tag tag-mint',
}

export default async function InstructorSettingsPage() {
  const { db, effectiveId } = await getPortalViewer('i')

  if (!effectiveId) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" />
        <div className="flex-1 overflow-y-auto">
          <div className="page-gutter min-h-full">
            <div className="glass glass-page min-h-full">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Settings</p>
              <h1 className="h1 mt-2" style={{ fontSize: 26 }}>Sign in to continue.</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

  const [{ data: instructor }, { data: hours }] = await Promise.all([
    db
      .from('instructors')
      .select('id, first_name, last_name, email, phone, bio, specialties, pay_rate, pay_type, staff_role, permission_overrides, background_check_date, background_check_expires')
      .eq('id', effectiveId)
      .maybeSingle(),
    db
      .from('instructor_hours')
      .select('id, worked_on, hours, notes, approved_at')
      .eq('instructor_id', effectiveId)
      .order('worked_on', { ascending: false })
      .limit(50),
  ])

  if (!instructor) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" />
        <div className="flex-1 overflow-y-auto">
          <div className="page-gutter min-h-full">
            <div className="glass glass-page min-h-full">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Settings</p>
              <h1 className="h1 mt-2" style={{ fontSize: 26 }}>Profile not found.</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const role = isStaffRole(instructor.staff_role) ? instructor.staff_role : 'instructor'
  const overrides = (instructor.permission_overrides ?? {}) as Record<string, PermLevel>

  const monthHours = (hours ?? []).filter(h => h.worked_on >= monthStart)
  const hoursThisMonth = monthHours.reduce((s, h) => s + Number(h.hours), 0)
  const totalHoursLogged = (hours ?? []).reduce((s, h) => s + Number(h.hours), 0)
  const payThisMonth =
    instructor.pay_type === 'hourly' && instructor.pay_rate != null
      ? hoursThisMonth * Number(instructor.pay_rate)
      : 0

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Profile & pay</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                Edit your information, log your hours, and see your permissions.
              </p>
            </div>

      <KpiStrip
        items={[
          { label: 'Pay rate', value: instructor.pay_rate != null ? `${formatCurrency(Number(instructor.pay_rate))} / ${(instructor.pay_type ?? 'hourly').replace('_', ' ')}` : '—' },
          { label: 'Hours this month', value: hoursThisMonth.toFixed(2) },
          { label: 'Earned this month', value: instructor.pay_type === 'hourly' ? formatCurrency(payThisMonth) : '—' },
          { label: 'Total logged', value: totalHoursLogged.toFixed(2) },
        ]}
      />

      <hr className="section-rule" />

      <SectionHead label="Profile" />
      <InstructorProfileForm instructor={{
        id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        email: instructor.email,
        phone: instructor.phone,
        bio: instructor.bio,
        specialties: instructor.specialties,
      }} />

      <hr className="section-rule" />

      <SectionHead label="Hours log" />
      <InstructorHoursLog entries={(hours ?? []) as any} />

      <hr className="section-rule" />

      <SectionHead label="Background check" />
      <div className="tight-list">
        <div className="tl-row no-lead">
          <div className="tl-main">
            <div className="t">Background check on file</div>
            <div className="s">
              {instructor.background_check_date
                ? `Last completed ${formatDate(instructor.background_check_date)}`
                : 'No date on file'}
            </div>
          </div>
          <div className="tl-trail">
            {instructor.background_check_expires
              ? <>Expires {formatDate(instructor.background_check_expires)}</>
              : <span className="tag tag-amber">Missing</span>}
          </div>
        </div>
      </div>

      <hr className="section-rule" />

      <SectionHead label="Your permissions" />
      <div className="mb-4">
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          You're assigned the <strong style={{ color: 'var(--ink-1)' }}>{ROLE_LABELS[role]}</strong> role.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
          {ROLE_DESCRIPTIONS[role]} Contact your studio admin to change.
        </p>
      </div>

      {PERMISSION_CATALOG.map(category => (
        <div key={category.name} className="mb-5">
          <p className="eyebrow mb-2" style={{ color: 'var(--ink-3)', fontSize: 10 }}>{category.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {category.permissions.map(perm => {
              const level = getPermission(role, overrides, perm.key)
              return (
                <div key={perm.key} className="flex items-center justify-between py-1">
                  <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{perm.label}</span>
                  <span className={LEVEL_TAG[level]} style={{ textTransform: 'capitalize' }}>{level}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
          </div>
        </div>
      </div>
    </div>
  )
}
