import { createAdminClient } from '@/lib/supabase/admin'

export type PortalKey = 'admin' | 'instructor' | 'parent' | 'partner'

/**
 * Returns the portals a user is entitled to access, based on their role plus
 * any linked records (instructors / partners / guardian_students). A user can
 * be entitled to multiple portals — e.g. an instructor who's also a parent.
 * Admins always get all four (they can preview any portal anyway).
 */
export async function getAvailablePortals(
  userId: string | null,
  role: string | null,
): Promise<PortalKey[]> {
  if (!userId) {
    if (role === 'admin') return ['admin', 'instructor', 'parent', 'partner']
    return []
  }

  if (role === 'admin') return ['admin', 'instructor', 'parent', 'partner']

  const admin = createAdminClient()
  const [{ data: instr }, { data: partn }, { data: guardian }, { data: prof }] = await Promise.all([
    admin.from('instructors').select('id').eq('profile_id', userId).maybeSingle(),
    admin.from('partners').select('id').eq('profile_id', userId).maybeSingle(),
    admin.from('guardian_students').select('id').eq('guardian_id', userId).limit(1).maybeSingle(),
    admin.from('profiles').select('extra_roles').eq('id', userId).maybeSingle(),
  ])
  const extra: string[] = (prof as any)?.extra_roles ?? []

  const result: PortalKey[] = []
  if (role === 'instructor' || instr) result.push('instructor')
  if (role === 'parent' || guardian || extra.includes('parent')) result.push('parent')
  if (role === 'partner' || partn) result.push('partner')

  // Everyone with an account can see the parent portal (it's the public-facing
  // member portal). Avoids dead-end "no portals available" UX.
  if (!result.includes('parent')) result.push('parent')

  return result
}

/**
 * Sync entitlement check used in the proxy. Allows access if the user's role
 * directly matches OR if they have a linked row giving them entitlement.
 * Admin always passes.
 */
export async function hasPortalEntitlement(
  userId: string,
  role: string | null,
  portal: PortalKey,
): Promise<boolean> {
  if (role === 'admin') return true
  if (portal === 'parent') return true // permissive — any authenticated user
  if (portal === 'admin') return role === 'admin'

  const admin = createAdminClient()
  if (portal === 'instructor') {
    if (role === 'instructor') return true
    const { data } = await admin.from('instructors').select('id').eq('profile_id', userId).maybeSingle()
    return !!data
  }
  if (portal === 'partner') {
    if (role === 'partner') return true
    const { data } = await admin.from('partners').select('id').eq('profile_id', userId).maybeSingle()
    return !!data
  }
  return false
}
