import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { last_four, card_brand, is_default, stripe_payment_method_id } = await req.json()
  if (!last_four || !/^\d{4}$/.test(String(last_four))) {
    return NextResponse.json({ error: 'last_four must be 4 digits' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (is_default) {
    await supabase.from('payment_methods').update({ is_default: false }).eq('guardian_id', id)
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      guardian_id: id,
      stripe_payment_method_id: stripe_payment_method_id || null,
      last_four: String(last_four),
      card_brand: card_brand || null,
      is_default: !!is_default,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'card_added',
    meta: { last_four, card_brand: card_brand ?? null, is_default: !!is_default },
  })

  return NextResponse.json({ ok: true, payment_method_id: data.id })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const pmId = searchParams.get('pm_id')
  if (!pmId) return NextResponse.json({ error: 'pm_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('payment_methods').delete().eq('id', pmId).eq('guardian_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('family_activity_log').insert({
    guardian_id: id,
    action: 'card_removed',
    meta: { payment_method_id: pmId },
  })

  return NextResponse.json({ ok: true })
}
