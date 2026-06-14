import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { requireStaff } from '@/lib/require-staff'
import { CARE_RATE, careHours, careAmount, type CareKind } from '@/lib/camp-care'

// GET /api/camps/[id]/registrations/[regId]/care — list care lines for a reg.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ regId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { regId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('camp_care')
    .select('*')
    .eq('registration_id', regId)
    .order('kind')
    .order('care_date', { nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ care: data ?? [] })
}

// POST /api/camps/[id]/registrations/[regId]/care
// Add care. Body either:
//   { kind, time, dates: ['2026-06-15', ...] }  → one per-day row per date
//   { kind, time, days: N }                      → one aggregate row (N days)
// hours/amount are derived from `time` ($15/hr) unless `hours` is given
// explicitly. `time` may be omitted only when `hours` is provided.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id: campId, regId } = await params
  const body = await req.json()

  const kind = body.kind as CareKind
  if (kind !== 'before' && kind !== 'after') {
    return NextResponse.json({ error: "kind must be 'before' or 'after'" }, { status: 400 })
  }
  const time: string | null = body.time ?? null
  const hours = Number(body.hours ?? (time ? careHours(kind, time) : 0))
  if (!(hours > 0)) {
    return NextResponse.json(
      { error: 'Care must be at least part of an hour — check the drop-off/pickup time.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: reg, error: regErr } = await supabase
    .from('camp_registrations')
    .select('id, student_id, camp_id, tenant_id')
    .eq('id', regId)
    .eq('camp_id', campId)
    .single()
  if (regErr || !reg) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  const base = {
    registration_id: regId,
    camp_id: reg.camp_id,
    student_id: reg.student_id,
    kind,
    hours,
    rate: CARE_RATE,
    care_time: time,
    source: 'manual' as const,
    tenant_id: reg.tenant_id ?? null,
  }

  const dates: string[] = Array.isArray(body.dates) ? body.dates.filter(Boolean) : []
  let result
  if (dates.length > 0) {
    // Per-day rows: upsert so re-adding a day refreshes it instead of 23505-ing.
    // care_date is set, so it matches the partial unique index.
    const rows = dates.map(d => ({ ...base, care_date: d, days: 1, amount: careAmount(hours, 1) }))
    result = await supabase
      .from('camp_care')
      .upsert(rows, { onConflict: 'registration_id,kind,care_date', ignoreDuplicates: false })
      .select()
  } else {
    // Aggregate row (care_date null): not covered by the partial index, so a
    // plain insert — staff can add another aggregate line if they need to.
    const days = Math.max(1, Math.floor(Number(body.days ?? 1)))
    result = await supabase
      .from('camp_care')
      .insert([{ ...base, care_date: null, days, amount: careAmount(hours, days) }])
      .select()
  }
  const { data, error } = result
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const written = data ?? []
  const total = written.reduce((s, r) => s + Number(r.amount || 0), 0)
  const dayCount = written.reduce((s, r) => s + Number(r.days || 0), 0)
  await logActivity({
    action: 'camp_care.added',
    targetTable: 'camp_care',
    targetId: regId,
    targetLabel: `${kind} care · ${dayCount} day(s) · $${total.toFixed(2)}`,
    metadata: { camp_id: campId, registration_id: regId, kind, count: written.length },
  }, supabase)

  return NextResponse.json({ care: data ?? [] }, { status: 201 })
}
