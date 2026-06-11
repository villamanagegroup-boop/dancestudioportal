import { createAdminClient } from '@/lib/supabase/admin'

export interface Tenant {
  id: string
  name: string
  slug: string | null
  code: string | null
}

/**
 * The active studio (tenant). Single-tenant for now — returns the one seeded
 * tenant. When multi-tenant lands, this is where the request host/subdomain is
 * resolved to the right tenant, and tenant_id starts being enforced.
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('tenants')
      .select('id, name, slug, code')
      .eq('active', true)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}
