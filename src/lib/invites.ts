// Shared account-invite creation. Used by the intake "convert" action; mirrors
// the logic in POST /api/account-invites so both produce identical invites.
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendAccountInvite } from '@/lib/resend'

const EXPIRY_DAYS = 7

export type InviteRole = 'parent' | 'instructor' | 'partner'

export interface CreateInviteResult {
  // An account already exists for this email — caller should match instead of
  // inviting. No invite is created in this case.
  existing?: { profileId: string; name: string; currentRole: string | null }
  ok?: true
  emailed?: boolean
  acceptUrl?: string
  inviteId?: string
}

// Creates an account_invites row, emails the accept link, and returns the
// outcome. Returns `{ existing }` (and creates nothing) when the email is
// already attached to a profile.
export async function createAccountInvite(
  admin: SupabaseClient,
  opts: {
    email: string
    first_name: string
    last_name: string
    role: InviteRole
    metadata?: Record<string, unknown>
    invitedBy: string
    inviterName: string
    appUrl: string
  },
): Promise<CreateInviteResult> {
  const email = opts.email.trim().toLowerCase()

  const { data: existingUser } = await admin
    .from('profiles')
    .select('id, role, first_name, last_name, email')
    .eq('email', email)
    .maybeSingle()
  if (existingUser) {
    return {
      existing: {
        profileId: existingUser.id,
        currentRole: existingUser.role ?? null,
        name: `${existingUser.first_name ?? ''} ${existingUser.last_name ?? ''}`.trim() || existingUser.email,
      },
    }
  }

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertErr } = await admin
    .from('account_invites')
    .insert({
      email,
      first_name: opts.first_name,
      last_name: opts.last_name,
      role: opts.role,
      metadata: opts.metadata ?? {},
      token,
      invited_by: opts.invitedBy,
      expires_at,
    })
    .select('id')
    .single()
  if (insertErr) throw new Error(insertErr.message)

  const acceptUrl = `${opts.appUrl.replace(/\/$/, '')}/accept-invite?token=${token}`

  let emailed = true
  try {
    await sendAccountInvite({
      to: email,
      firstName: opts.first_name,
      role: opts.role,
      inviterName: opts.inviterName,
      acceptUrl,
    })
  } catch {
    emailed = false
  }

  return { ok: true, emailed, acceptUrl, inviteId: invite.id }
}
