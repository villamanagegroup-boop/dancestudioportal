import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campId } = await params
  const body = await req.json()

  if (!body.day_date || !body.title?.trim()) {
    return NextResponse.json({ error: 'Day and title are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('camp_itinerary')
    .insert({
      camp_id: campId,
      day_date: body.day_date,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      title: body.title.trim(),
      location: body.location || null,
      notes: body.notes || null,
      sort_order: Number(body.sort_order) || 0,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
