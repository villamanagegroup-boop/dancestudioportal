import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { notify } from '@/lib/notify'

// Map a site-Supabase table name to the friendly form-type slug we store on
// site_intake. Add a row here when a new public-site form table is wired up
// to the Supabase DB webhook.
//
// `spirit_week_ideas` was intentionally removed 2026-06-01 — the form was
// retired from the public site. If it's ever reinstated, add the mapping
// back: spirit_week_ideas: 'spirit_week'.
const FORM_TYPE_BY_TABLE: Record<string, string> = {
  contact_submissions:         'contact',
  birthday_bookings:           'birthday',
  camp_registrations:          'camp',
  summer_class_registrations:  'summer_class',
  recital_orders:              'recital_order',
  recital_shirt_orders:        'recital_shirt',
  adult_series_interest:       'adult_series',
}

type IncomingRow = Record<string, unknown> & { id?: string }

function pickEmail(row: IncomingRow): string | null {
  return (row.email as string) || (row.parent_email as string) || null
}

function pickName(row: IncomingRow, source_form: string): string | null {
  if (source_form === 'contact') {
    const fn = (row.first_name as string) || ''
    const ln = (row.last_name as string) || ''
    const joined = `${fn} ${ln}`.trim()
    return joined || null
  }
  return (row.parent_name as string) || (row.contact_name as string) || (row.name as string) || null
}

// Supabase DB webhook payload:
//   { type: 'INSERT', table, schema, record, old_record, ... }
type SupabaseWebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: IncomingRow
  old_record?: IncomingRow | null
}

export async function POST(req: NextRequest) {
  // Authenticate via shared secret. The webhook config on the site's Supabase
  // attaches this header so the portal can verify the call came from us.
  const expected = process.env.SITE_INTAKE_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'Intake not configured' }, { status: 503 })
  }
  const got = req.headers.get('x-intake-secret')
  if (got !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SupabaseWebhookPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only act on INSERT events. UPDATE/DELETE not handled in phase 1.
  if (body.type && body.type !== 'INSERT') {
    return NextResponse.json({ ok: true, skipped: body.type }, { status: 200 })
  }

  const table = body.table
  const record = body.record
  if (!table || !record) {
    return NextResponse.json({ error: 'Missing table or record' }, { status: 400 })
  }

  const source_form = FORM_TYPE_BY_TABLE[table]
  if (!source_form) {
    return NextResponse.json({ error: `Unknown source table: ${table}` }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('site_intake')
    .insert({
      source_form,
      source_table: table,
      source_row_id: record.id ?? null,
      submitter_email: pickEmail(record),
      submitter_name: pickName(record, source_form),
      payload: record,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation. The webhook retried delivery of an already-
    // ingested row. Return 200 so Supabase stops retrying.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const who = pickName(record, source_form) ?? pickEmail(record)
  await logActivity({
    action: 'intake.received',
    targetTable: 'site_intake',
    targetId: data.id,
    targetLabel: who,
    metadata: { source_form, source_table: table },
    system: true,
  }, admin)

  await notify({
    type: 'intake.received',
    title: 'New site submission',
    body: who ? `${who} · ${source_form.replace(/_/g, ' ')}` : `New ${source_form.replace(/_/g, ' ')} form`,
    href: '/intake',
    metadata: { intake_id: data.id, source_form },
  }, admin)

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
