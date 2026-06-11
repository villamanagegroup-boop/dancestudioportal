import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

const COOKIE = 'portal_view_as'

// 'g' = parent portal (viewer id is a guardian profile id)
// 'i' = instructor portal (viewer id is an instructor row id)
// 'p' = partner portal (viewer id is a partner row id)
type Kind = 'g' | 'i' | 'p'

export interface PortalViewer {
  /** The real signed-in user id, or null on the dev bypass. */
  realUserId: string | null
  role: string | null
  /** True for admins and the no-session dev bypass — may preview other portals. */
  canPreview: boolean
  /** True when the data shown is someone else's (admin/dev viewing a portal). */
  isPreview: boolean
  /** The effective id to scope data by (guardian profile id, or instructor id). */
  effectiveId: string | null
  /** Admin client when previewing (RLS bypassed), SSR client for a real session. */
  db: SupabaseClient
}

export async function getPortalViewer(kind: Kind): Promise<PortalViewer> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Resolve role + owner status with the admin client (RLS bypass). The SSR
  // client can return null here if profiles has no self-read policy, which
  // would misclassify an admin/owner as a parent and lock them out of portals.
  let role: string | null = null
  let isOwner = false
  if (user) {
    const [{ data: prof }, { data: ownerRow }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('instructors').select('id').eq('profile_id', user.id).eq('staff_role', 'owner').maybeSingle(),
    ])
    role = prof?.role ?? 'parent'
    isOwner = !!ownerRow
  }

  // Admins and the studio owner can preview any portal (as can the no-session
  // dev bypass).
  const canPreview = !user || role === 'admin' || isOwner

  // The cookie stores "g:<id>" or "i:<id>" so the two portals don't collide.
  let viewAsId: string | null = null
  if (canPreview) {
    const raw = (await cookies()).get(COOKIE)?.value
    if (raw && raw.startsWith(kind + ':')) viewAsId = raw.slice(2) || null
  }

  let effectiveId: string | null
  if (canPreview) {
    effectiveId = viewAsId
    // Default to the first available person so the portal isn't empty on first open.
    if (!effectiveId) {
      if (kind === 'g') {
        const { data } = await admin
          .from('profiles').select('id').eq('role', 'parent').limit(1).maybeSingle()
        effectiveId = data?.id ?? null
      } else if (kind === 'i') {
        const { data } = await admin
          .from('instructors').select('id').eq('active', true).order('last_name').limit(1).maybeSingle()
        effectiveId = data?.id ?? null
      } else {
        const { data } = await admin
          .from('partners').select('id').eq('active', true).order('name').limit(1).maybeSingle()
        effectiveId = data?.id ?? null
      }
    }
  } else {
    // Real session. Resolve the appropriate scoped id for the user.
    if (kind === 'i' && user) {
      const { data } = await supabase
        .from('instructors').select('id').eq('profile_id', user.id).maybeSingle()
      effectiveId = data?.id ?? null
    } else if (kind === 'p' && user) {
      const { data } = await supabase
        .from('partners').select('id').eq('profile_id', user.id).maybeSingle()
      effectiveId = data?.id ?? null
    } else {
      effectiveId = user?.id ?? null
    }
  }

  const isPreview = canPreview
  return {
    realUserId: user?.id ?? null,
    role,
    canPreview,
    isPreview,
    effectiveId,
    // Always the service-role client: every portal query is scoped by
    // effectiveId, and this keeps reads working under RLS lockdown (the
    // service role bypasses RLS; the anon key is denied by default).
    db: admin,
  }
}
