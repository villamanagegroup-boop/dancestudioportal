// Unified activity logging — the single write-path for the cross-cutting
// activity_log table. Call logActivity() from any API route or server action
// after a meaningful create/update/delete (or a login).
//
// Design notes:
//  - Fire-and-forget: this never throws. A logging failure must never break the
//    request that triggered it, so everything is wrapped in try/catch.
//  - Actor resolution: if you don't pass actorId, we read the signed-in user
//    from the SSR client and denormalize their role + name. Webhooks / system
//    events can pass { system: true } (or simply have no session) to log with a
//    null actor.
//  - Pass the same service-role `admin` client the route already holds to avoid
//    spinning up a second one.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActivityInput {
  /** Dotted verb, e.g. 'student.updated', 'enrollment.created', 'auth.signed_in'. */
  action: string
  /** The affected table, e.g. 'students'. */
  targetTable?: string
  /** The affected row id (uuid), when applicable. */
  targetId?: string | null
  /** Human-readable label for the target, e.g. 'Jane Doe'. */
  targetLabel?: string | null
  /** Arbitrary extra context (diffs, amounts, source, etc.). */
  metadata?: Record<string, unknown> | null
  /** Skip session lookup and log as a system/webhook event (null actor). */
  system?: boolean
}

/**
 * Insert one activity_log row. Resolves the acting user automatically unless
 * `system` is set. Never throws.
 */
export async function logActivity(
  input: ActivityInput,
  admin?: SupabaseClient,
): Promise<void> {
  try {
    const db = admin ?? createAdminClient()

    let actorId: string | null = null
    let actorRole: string | null = null
    let actorName: string | null = null
    let tenantId: string | null = null

    if (!input.system) {
      try {
        const ssr = await createClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (user) {
          actorId = user.id
          const { data: prof } = await db
            .from('profiles')
            .select('role, first_name, last_name, tenant_id')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) {
            actorRole = prof.role ?? null
            actorName = `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() || null
            tenantId = prof.tenant_id ?? null
          }
        }
      } catch {
        // No session / not in a request context — log as system below.
      }
    }

    await db.from('activity_log').insert({
      tenant_id: tenantId,
      actor_id: actorId,
      actor_role: actorRole,
      actor_name: actorName,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      metadata: input.metadata ?? {},
    })
  } catch (err) {
    // Best-effort: swallow so logging can never break the caller.
    console.error('[activity] log failed:', err)
  }
}
