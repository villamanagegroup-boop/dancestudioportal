import { createAdminClient } from '@/lib/supabase/admin'
import { sendEnrollmentConfirmation } from '@/lib/resend'
import { formatDate } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { requireStaff } from '@/lib/require-staff'

const VALID_STATUS = ['active', 'waitlisted', 'dropped', 'completed', 'pending']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const { data: current, error: curErr } = await supabase
    .from('enrollments')
    .select('id, status, student_id, class_id')
    .eq('id', id)
    .single()
  if (curErr || !current) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}

  if (body.archived !== undefined) patch.archived = !!body.archived

  if (body.class_id !== undefined && body.class_id !== current.class_id) {
    const { data: target } = await supabase
      .from('classes')
      .select('id, season_id')
      .eq('id', body.class_id)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'Target class not found' }, { status: 400 })
    }
    patch.class_id = target.id
    patch.season_id = target.season_id
  }

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
    if (body.status === 'dropped') {
      patch.dropped_at = new Date().toISOString()
    } else {
      patch.dropped_at = null
    }
    if (body.status === 'active') {
      patch.waitlist_position = null
    }
  }

  if (body.notes !== undefined) patch.notes = body.notes || null
  if (body.waitlist_position !== undefined) {
    patch.waitlist_position = body.waitlist_position
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('enrollments')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  {
    const { data: student } = await supabase
      .from('students').select('first_name, last_name').eq('id', current.student_id).maybeSingle()
    const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || null : null
    const statusChanged = body.status !== undefined && body.status !== current.status
    await logActivity({
      action: statusChanged ? `enrollment.${body.status}` : 'enrollment.updated',
      targetTable: 'enrollments',
      targetId: id,
      targetLabel: studentName,
      metadata: {
        fields: Object.keys(patch),
        ...(statusChanged ? { from: current.status, to: body.status } : {}),
      },
    }, supabase)
  }

  // Best-effort confirmation email when promoting onto the roster
  const promotedToActive = body.status === 'active' && current.status !== 'active'
  if (promotedToActive) {
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('name, monthly_tuition, start_date, season:seasons(start_date)')
        .eq('id', current.class_id)
        .single()
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', current.student_id)
        .single()
      const { data: guardian } = await supabase
        .from('guardian_students')
        .select('guardian:profiles(email, first_name, last_name)')
        .eq('student_id', current.student_id)
        .eq('is_primary', true)
        .single()
      const g = guardian?.guardian as any
      if (g && student && cls) {
        const start = cls.start_date ?? (cls.season as any)?.start_date
        await sendEnrollmentConfirmation({
          to: g.email,
          guardianName: `${g.first_name} ${g.last_name}`,
          studentName: `${student.first_name} ${student.last_name}`,
          className: cls.name,
          startDate: start ? formatDate(start) : 'TBD',
          tuition: cls.monthly_tuition,
        })
      }
    } catch {}
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const supabase = createAdminClient()
  const { data: before } = await supabase
    .from('enrollments')
    .select('student:students(first_name, last_name)')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('enrollments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const s = (before?.student as { first_name?: string; last_name?: string } | null) ?? null
  await logActivity({
    action: 'enrollment.deleted',
    targetTable: 'enrollments',
    targetId: id,
    targetLabel: s ? `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || null : null,
  }, supabase)

  return NextResponse.json({ ok: true })
}
