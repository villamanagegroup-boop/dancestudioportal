import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Body = {
  phone?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  referral_source?: string
  email_opt_in?: boolean
  sms_opt_in?: boolean
  dancer?: {
    first_name: string
    last_name: string
    date_of_birth: string
  } | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = (await request.json()) as Body
  const admin = createAdminClient()

  const customFields: Record<string, string> = {}
  if (body.referral_source) customFields.referral_source = body.referral_source

  const profileUpdate: Record<string, unknown> = {
    phone: body.phone ?? null,
    address_street: body.address_street ?? null,
    address_city: body.address_city ?? null,
    address_state: body.address_state ?? null,
    address_zip: body.address_zip ?? null,
    email_opt_in: body.email_opt_in ?? true,
    sms_opt_in: body.sms_opt_in ?? false,
  }
  if (Object.keys(customFields).length > 0) {
    profileUpdate.custom_fields = customFields
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)

  if (profileErr) {
    return NextResponse.json({ error: `Profile update failed: ${profileErr.message}` }, { status: 500 })
  }

  if (body.dancer && body.dancer.first_name && body.dancer.last_name && body.dancer.date_of_birth) {
    const { data: student, error: studentErr } = await admin
      .from('students')
      .insert({
        first_name: body.dancer.first_name,
        last_name: body.dancer.last_name,
        date_of_birth: body.dancer.date_of_birth,
      })
      .select('id')
      .single()

    if (studentErr) {
      return NextResponse.json({ error: `Student create failed: ${studentErr.message}` }, { status: 500 })
    }

    const { error: linkErr } = await admin
      .from('guardian_students')
      .insert({
        guardian_id: user.id,
        student_id: student.id,
        relationship: 'parent',
        is_primary: true,
      })

    if (linkErr) {
      return NextResponse.json({ error: `Link create failed: ${linkErr.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
