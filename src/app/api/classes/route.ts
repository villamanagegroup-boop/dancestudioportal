import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('classes').select(`
    *, instructor:instructors(first_name, last_name),
    room:rooms(name), class_type:class_types(name, style, color)
  `).eq('active', true).order('day_of_week').order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  let stripePriceId: string | null = null
  try {
    const price = await stripe.prices.create({
      unit_amount: Math.round(Number(body.monthly_tuition) * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: body.name },
    })
    stripePriceId = price.id
  } catch {}

  const { data, error } = await supabase.from('classes').insert({
    name: body.name,
    season_id: body.season_id,
    class_type_id: body.class_type_id,
    instructor_id: body.instructor_id || null,
    room_id: body.room_id || null,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    max_students: body.max_students,
    monthly_tuition: body.monthly_tuition,
    registration_fee: body.registration_fee ?? 0,
    stripe_price_id: stripePriceId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
