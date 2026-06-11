import { createAdminClient } from '@/lib/supabase/admin'

// The studio's family-ID prefix (e.g. "CCD"). Sourced from the tenant first
// (the multi-tenant home for it), falling back to the studio_profile setting,
// then "CCD".
export async function getStudioCode(): Promise<string> {
  try {
    const admin = createAdminClient()
    const { data: tenant } = await admin
      .from('tenants').select('code').eq('active', true).order('created_at').limit(1).maybeSingle()
    if (typeof tenant?.code === 'string' && tenant.code.trim()) return tenant.code.trim().toUpperCase()

    const { data } = await admin.from('studio_settings').select('value').eq('key', 'studio_profile').maybeSingle()
    const code = (data?.value as any)?.code
    return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : 'CCD'
  } catch {
    return 'CCD'
  }
}

// Family account ID, e.g. CCD1042.
export function formatFamilyId(familyNo: number | null | undefined, code: string): string {
  return familyNo == null ? '—' : `${code}${familyNo}`
}

// Individual member ID (parent / adult / dancer) — a plain 5-digit number.
export function formatMemberId(memberNo: number | null | undefined): string {
  return memberNo == null ? '—' : String(memberNo)
}
