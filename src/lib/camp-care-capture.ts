// Auto-capture before/after care from a website camp submission.
//
// The public registration form (capitalcoredancewebsite) lets parents add
// before/after care; that lands in site_intake.payload.campers[i] as
// beforeCare/afterCare + careItems. Portal camp registrations, however, are
// created by staff one camper-week at a time — there is no automated
// site_intake → camp_registrations conversion. So we bridge here: given a
// freshly-created registration, find the matching website submission + camper +
// week, and materialize the care as camp_care rows.
//
// Best-effort and idempotent: safe to call on every registration create and to
// re-run manually. Returns the number of care rows written.

import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCamperCare } from '@/lib/camp-care'

function norm(s: string): string {
  return s.toLowerCase().replace(/\bcamp\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

interface SeedArgs {
  regId: string
  campId: string
  campName: string | null
  studentId: string
  studentName: string
  guardianEmail: string | null
  tenantId?: string | null
}

export async function seedCareFromWebsite(
  admin: SupabaseClient,
  { regId, campId, campName, studentId, studentName, guardianEmail, tenantId }: SeedArgs,
): Promise<number> {
  // Already have care on this registration? Don't double up.
  const { count: existing } = await admin
    .from('camp_care')
    .select('*', { count: 'exact', head: true })
    .eq('registration_id', regId)
  if ((existing ?? 0) > 0) return 0

  // Find candidate website submissions by guardian email, newest first.
  let q = admin
    .from('site_intake')
    .select('id, payload')
    .eq('source_form', 'camp')
    .order('created_at', { ascending: false })
    .limit(25)
  if (guardianEmail) q = q.eq('submitter_email', guardianEmail)
  const { data: intakes } = await q
  if (!intakes || intakes.length === 0) return 0

  const wantName = norm(studentName)
  const wantCamp = campName ? norm(campName) : ''

  for (const intake of intakes) {
    const payload = (intake.payload ?? {}) as Record<string, unknown>
    const campers = (payload.campers ?? []) as Array<Record<string, unknown>>
    const camper = campers.find(c => norm(String(c.name ?? '')) === wantName)
    if (!camper) continue

    const lines = parseCamperCare(camper)
    // Keep only care for THIS camp/week (weekLabel contains the camp name).
    const forThisCamp = lines.filter(l => {
      if (!l.weekLabel) return false
      if (!wantCamp) return true
      return norm(l.weekLabel).includes(wantCamp)
    })
    if (forThisCamp.length === 0) continue

    const rows = forThisCamp.map(l => ({
      registration_id: regId,
      camp_id: campId,
      student_id: studentId,
      kind: l.kind,
      care_date: null,
      days: l.days,
      hours: l.hours,
      rate: 15,
      amount: l.amount,
      care_time: l.time,
      paid: false,
      source: 'website' as const,
      notes: `Imported from website submission ${intake.id}`,
      tenant_id: tenantId ?? null,
    }))

    // Plain insert: aggregate rows carry care_date null, which the partial
    // unique index doesn't cover, so ON CONFLICT can't apply. The existing-care
    // guard above already prevents double-seeding.
    const { data, error } = await admin.from('camp_care').insert(rows).select('id')
    if (error) return 0
    return data?.length ?? 0
  }
  return 0
}
