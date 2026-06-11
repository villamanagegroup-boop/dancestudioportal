import { getPortalViewer } from '@/lib/portal-viewer'
import { getStudioCode, formatFamilyId, formatMemberId } from '@/lib/ids'
import ParentAccountHub from '@/components/portal/ParentAccountHub'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export const dynamic = 'force-dynamic'

export default async function ParentAccountPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const [{ data: profile }, { data: links }, studioCode] = await Promise.all([
    db.from('profiles')
      .select('id, first_name, last_name, email, phone, secondary_email, secondary_phone, address_street, address_city, address_state, address_zip, email_opt_in, sms_opt_in, member_no, family_id')
      .eq('id', gid).maybeSingle(),
    db.from('guardian_students')
      .select('relationship, student:students(id, first_name, last_name, date_of_birth, active, member_no)')
      .eq('guardian_id', gid),
    getStudioCode(),
  ])

  let familyNo: number | null = null
  if (profile?.family_id) {
    const { data: fam } = await db.from('families').select('family_no').eq('id', profile.family_id).maybeSingle()
    familyNo = fam?.family_no ?? null
  }

  const dancers = (links ?? [])
    .map((l: any) => ({ ...l.student, relationship: l.relationship }))
    .filter((s: any) => s && s.id)
  const hasSelf = (links ?? []).some((l: any) => l.relationship === 'self')

  const familyIdLabel = formatFamilyId(familyNo, studioCode)
  const memberIdLabel = formatMemberId(profile?.member_no)

  const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'your account'

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Account</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          {name || 'Your account'}.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          Your details, dancers, guardians, billing, and a direct line to the studio.
        </p>
        {familyIdLabel !== '—' && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg px-3 py-1.5" style={{ background: 'var(--glass-thin)', border: '1px solid var(--line)' }}>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Family ID</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--ink-1)' }}>{familyIdLabel}</span>
            {memberIdLabel !== '—' && <><span style={{ color: 'var(--ink-4)' }}>·</span><span className="text-xs" style={{ color: 'var(--ink-3)' }}>Member</span><span className="text-sm font-mono" style={{ color: 'var(--ink-2)' }}>{memberIdLabel}</span></>}
          </div>
        )}
      </div>

      <ParentAccountHub profile={(profile ?? {}) as any} dancers={dancers as any} hasSelf={hasSelf} />
    </div>
  )
}
