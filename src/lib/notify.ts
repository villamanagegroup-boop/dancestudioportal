// In-app notifications — the write-path for the notifications table. Call
// notify() at the same event points as logActivity() when an event warrants a
// studio-facing alert (new intake, registration, payment, …).
//
// Like logActivity, this is fire-and-forget: it never throws, so a failed
// notification can't break the request that triggered it. Pass the route's
// existing service-role client to avoid creating a second one.

import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface NotifyInput {
  /** Dotted key, mirrors the activity action, e.g. 'intake.received'. */
  type: string
  /** Short headline shown in the bell menu. */
  title: string
  /** Optional secondary line. */
  body?: string | null
  /** Where the bell item navigates when clicked. */
  href?: string | null
  /** Audience role; defaults to studio staff. */
  audience?: string
  /** Narrow to a single recipient instead of the whole audience. */
  recipientId?: string | null
  /** Tag onto the same tenant as the rest of the studio's data. */
  tenantId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function notify(
  input: NotifyInput,
  admin?: SupabaseClient,
): Promise<void> {
  try {
    const db = admin ?? createAdminClient()
    await db.from('notifications').insert({
      audience: input.audience ?? 'admin',
      recipient_id: input.recipientId ?? null,
      tenant_id: input.tenantId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
    })
  } catch (err) {
    console.error('[notify] insert failed:', err)
  }
}
