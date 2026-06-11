import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fields a member may see + edit about themselves. Deliberately excludes
// back-office fields (role, tags, custom_fields, registration_anniversary,
// active, extra_roles) and the login email (changed elsewhere).
const READABLE = [
  'id', 'first_name', 'last_name', 'email', 'phone',
  'secondary_email', 'secondary_phone',
  'address_street', 'address_city', 'address_state', 'address_zip',
  'email_opt_in', 'sms_opt_in', 'role',
  'job_title', 'bio', 'photo_url',
] as const

const EDITABLE = [
  'first_name', 'last_name', 'phone',
  'secondary_email', 'secondary_phone',
  'address_street', 'address_city', 'address_state', 'address_zip',
  'email_opt_in', 'sms_opt_in',
  'job_title', 'bio', 'photo_url',
] as const

const BOOLEAN_FIELDS = new Set(['email_opt_in', 'sms_opt_in'])
const REQUIRED_TEXT = new Set(['first_name', 'last_name'])

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select(READABLE.join(', '))
    .eq('id', user.id)
    .single()
  return NextResponse.json({ profile })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const field of EDITABLE) {
    if (!(field in body)) continue
    const v = body[field]
    if (BOOLEAN_FIELDS.has(field)) {
      update[field] = !!v
    } else if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed === '' && REQUIRED_TEXT.has(field)) continue // never blank a required field
      update[field] = trimmed === '' ? null : trimmed
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
