import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Partner name is required.' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partners')
    .insert({
      name: body.name.trim(),
      partner_type: body.partner_type || 'business',
      contact_name: body.contact_name?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      rate_amount: body.rate_amount === '' || body.rate_amount == null ? null : Number(body.rate_amount),
      rate_unit: body.rate_unit || 'flat',
      notes: body.notes?.trim() || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
