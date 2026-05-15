import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  if (!body.first_name || !body.last_name || !body.email) {
    return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('instructors').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
