import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { seedCareFromWebsite } from '@/lib/camp-care-capture'

// POST /api/camps/[id]/registrations/[regId]/care/import
// Manually pull before/after care from the matching website submission onto
// this registration. Idempotent (no-op if the reg already has care).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id: campId, regId } = await params
  const supabase = createAdminClient()

  const { data: reg, error } = await supabase
    .from('camp_registrations')
    .select('id, student_id, tenant_id, camp:camps(name), student:students(first_name, last_name)')
    .eq('id', regId)
    .eq('camp_id', campId)
    .single()
  if (error || !reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  const student = reg.student as { first_name?: string; last_name?: string } | null
  const studentName = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim()
  if (!studentName) return NextResponse.json({ error: 'Registration has no student' }, { status: 400 })

  const { data: link } = await supabase
    .from('guardian_students')
    .select('guardian:profiles(email)')
    .eq('student_id', reg.student_id)
    .eq('is_primary', true)
    .maybeSingle()
  const guardianEmail = (link?.guardian as { email?: string } | null)?.email ?? null

  const count = await seedCareFromWebsite(supabase, {
    regId,
    campId,
    campName: (reg.camp as { name?: string } | null)?.name ?? null,
    studentId: reg.student_id,
    studentName,
    guardianEmail,
    tenantId: reg.tenant_id ?? null,
  })

  return NextResponse.json({ ok: true, imported: count })
}
