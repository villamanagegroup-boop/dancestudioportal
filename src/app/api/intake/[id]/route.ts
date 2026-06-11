import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAccountInvite } from '@/lib/invites'
import { parseSubmitterName, detectDancer, detectPhone } from '@/lib/intake'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { admin, userId: user.id, profile }
}

// PATCH /api/intake/[id] — triage actions on a site_intake row.
// Phase 2a: `dismiss`. Phase 2b: `match` (link to an existing family — no
// record creation). Conversion actions land in later phases.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')

  if (action === 'dismiss') {
    const admin_notes = typeof body.admin_notes === 'string' && body.admin_notes.trim()
      ? body.admin_notes.trim()
      : null

    const { error } = await ctx.admin
      .from('site_intake')
      .update({
        status: 'dismissed',
        admin_notes,
        processed_at: new Date().toISOString(),
        processed_by: ctx.userId,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'match') {
    const profile_id = typeof body.profile_id === 'string' ? body.profile_id : ''
    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }
    // The matched family's student ids, so later phases (2c/2d) can use them.
    const student_ids = Array.isArray(body.student_ids)
      ? body.student_ids.filter((x: unknown): x is string => typeof x === 'string')
      : []

    // Match only links the row — it deliberately does NOT mutate profiles,
    // students, or any child record, and does not mark the row processed
    // (a matched row still flows into the conversion phases).
    const { error } = await ctx.admin
      .from('site_intake')
      .update({
        status: 'matched',
        linked_profile_id: profile_id,
        linked_student_ids: student_ids,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'convert') {
    // Create a brand-new family from this submission and send a portal invite.
    // The parent's profile + dancer are materialized on accept (account-invites
    // accept flow reads metadata.dancer); here we only stage the invite.
    const { data: row, error: rowErr } = await ctx.admin
      .from('site_intake')
      .select('source_form, submitter_name, submitter_email, payload, status')
      .eq('id', id)
      .single()
    if (rowErr || !row) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    if (row.status === 'invited') {
      return NextResponse.json({ error: 'This submission has already been invited.' }, { status: 409 })
    }

    const email = String(row.submitter_email ?? '').trim()
    if (!email) {
      return NextResponse.json(
        { error: 'This submission has no email address — match it to an existing family instead.' },
        { status: 400 },
      )
    }

    const { first_name, last_name } = parseSubmitterName(row.submitter_name)
    if (!first_name) {
      return NextResponse.json(
        { error: 'This submission has no sender name — match it to an existing family instead.' },
        { status: 400 },
      )
    }

    const payload = (row.payload ?? {}) as Record<string, unknown>
    const dancer = detectDancer(payload, last_name)
    const phone = detectPhone(payload)

    const metadata: Record<string, unknown> = {
      intake_id: id,
      source_form: row.source_form,
    }
    if (phone) metadata.phone = phone
    if (dancer) metadata.dancer = dancer

    const inviterName =
      `${ctx.profile?.first_name ?? ''} ${ctx.profile?.last_name ?? ''}`.trim() || 'The studio'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

    let result
    try {
      result = await createAccountInvite(ctx.admin, {
        email, first_name, last_name: last_name || first_name,
        role: 'parent', metadata, invitedBy: ctx.userId, inviterName, appUrl,
      })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to create invite' },
        { status: 400 },
      )
    }

    // Email already has an account — don't invite; tell the UI to match instead.
    if (result.existing) {
      return NextResponse.json({
        existing: true,
        profileId: result.existing.profileId,
        name: result.existing.name,
        message: `An account already exists for ${email} (${result.existing.currentRole ?? 'unknown role'}). Match this submission to that family instead.`,
      })
    }

    const admin_notes = result.emailed
      ? null
      : `Invite email failed to send. Share this link manually: ${result.acceptUrl}`

    const { error: updErr } = await ctx.admin
      .from('site_intake')
      .update({
        status: 'invited',
        admin_notes,
        processed_at: new Date().toISOString(),
        processed_by: ctx.userId,
      })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      acceptUrl: result.acceptUrl,
      dancerCreated: !!dancer,
    })
  }

  return NextResponse.json({ error: `Unsupported action: ${action || '(none)'}` }, { status: 400 })
}
