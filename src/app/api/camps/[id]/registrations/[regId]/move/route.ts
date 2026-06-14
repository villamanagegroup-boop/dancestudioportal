import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'
import { requireStaff } from '@/lib/require-staff'

// POST /api/camps/[id]/registrations/[regId]/move  { camp_id: <target> }
// Move a camper's registration to a different camp/week. Payment + care travel
// with the registration; attendance for the old week is cleared (its dates no
// longer apply). Refuses if the camper is already registered for the target.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id: campId, regId } = await params
  const { camp_id: targetId } = await req.json()

  if (!targetId) return NextResponse.json({ error: 'camp_id is required' }, { status: 400 })
  if (targetId === campId) return NextResponse.json({ error: 'That camper is already in this week.' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: reg, error: regErr } = await supabase
    .from('camp_registrations')
    .select('id, student_id, status, student:students(first_name, last_name)')
    .eq('id', regId)
    .eq('camp_id', campId)
    .single()
  if (regErr || !reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  const { data: target, error: tErr } = await supabase
    .from('camps').select('id, name').eq('id', targetId).single()
  if (tErr || !target) return NextResponse.json({ error: 'Target camp not found' }, { status: 404 })

  // Already registered for the destination (any non-cancelled row)?
  const { data: clash } = await supabase
    .from('camp_registrations')
    .select('id')
    .eq('camp_id', targetId)
    .eq('student_id', reg.student_id)
    .not('status', 'eq', 'cancelled')
    .maybeSingle()
  if (clash) {
    const student = reg.student as { first_name?: string; last_name?: string } | null
    const name = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim() || 'That camper'
    return NextResponse.json(
      { error: `${name} is already registered for ${target.name}. Cancel one of the duplicates instead of moving.` },
      { status: 409 },
    )
  }

  // Re-point the registration. The unique (camp_id, student_id) index is safe
  // here because we just confirmed no clashing row exists.
  const { error: updErr } = await supabase
    .from('camp_registrations').update({ camp_id: targetId }).eq('id', regId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

  // Care lines follow the camper to the new week.
  await supabase.from('camp_care').update({ camp_id: targetId }).eq('registration_id', regId)

  // Old-week attendance no longer applies (different dates) — clear it.
  await supabase.from('camp_attendance')
    .delete().eq('camp_id', campId).eq('student_id', reg.student_id)

  const student = reg.student as { first_name?: string; last_name?: string } | null
  const studentName = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim() || null
  await logActivity({
    action: 'camp_registration.moved',
    targetTable: 'camp_registrations',
    targetId: regId,
    targetLabel: studentName && target.name ? `${studentName} → ${target.name}` : studentName,
    metadata: { from_camp: campId, to_camp: targetId, student_id: reg.student_id },
  }, supabase)

  await notify({
    type: 'camp_registration.moved',
    title: 'Camper moved weeks',
    body: studentName ? `${studentName} moved to ${target.name}` : 'A camper was moved to another week',
    href: `/camps/${targetId}`,
    metadata: { from_camp: campId, to_camp: targetId },
  }, supabase)

  return NextResponse.json({ ok: true, moved_to: targetId })
}
