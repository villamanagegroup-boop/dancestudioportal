import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'

const STUDENT_FIELDS = [
  'first_name', 'last_name', 'date_of_birth', 'gender',
  'grade', 'association_id',
  'registration_anniversary', 'anniversary_fee_override',
  'roll_sheet_comment', 'flag_alert',
  'medical_notes', 'allergies', 'medications', 'medical_conditions',
  'doctor_name', 'doctor_phone',
  'insurance_provider', 'insurance_policy_number',
  'shoe_size', 'shirt_size',
  'emergency_contact_name', 'emergency_contact_phone',
  'membership_tier', 'tags', 'custom_fields',
  'photo_url', 'active',
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const field of STUDENT_FIELDS) {
    if (field in body) update[field] = body[field]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { data: before } = await supabase
    .from('students').select(STUDENT_FIELDS.join(',')).eq('id', id).single()
  const { error } = await supabase.from('students').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: 'profile_updated',
    meta: { before, after: update },
  })

  const b = before as { first_name?: string; last_name?: string } | null
  const label = `${(update.first_name as string) ?? b?.first_name ?? ''} ${(update.last_name as string) ?? b?.last_name ?? ''}`.trim() || null
  await logActivity({
    action: 'student.updated',
    targetTable: 'students',
    targetId: id,
    targetLabel: label,
    metadata: { fields: Object.keys(update) },
  }, supabase)

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: before } = await supabase
    .from('students').select('first_name, last_name').eq('id', id).maybeSingle()
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'student.deleted',
    targetTable: 'students',
    targetId: id,
    targetLabel: before ? `${before.first_name ?? ''} ${before.last_name ?? ''}`.trim() || null : null,
  }, supabase)

  return NextResponse.json({ ok: true })
}
