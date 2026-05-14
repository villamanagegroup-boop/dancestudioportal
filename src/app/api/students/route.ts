import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const active = searchParams.get('active')

  let query = supabase.from('students').select(`
    *, guardian_students(guardian:profiles(first_name, last_name, email))
  `)
  if (active !== null) query = query.eq('active', active === 'true')

  const { data, error } = await query.order('last_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.guardian_id) {
    return NextResponse.json({ error: 'guardian_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('students').insert({
    first_name: body.first_name,
    last_name: body.last_name,
    date_of_birth: body.date_of_birth,
    gender: body.gender || null,
    medical_notes: body.medical_notes || null,
    emergency_contact_name: body.emergency_contact_name || null,
    emergency_contact_phone: body.emergency_contact_phone || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: linkError } = await supabase.from('guardian_students').insert({
    guardian_id: body.guardian_id,
    student_id: data.id,
    relationship: 'parent',
    is_primary: true,
  })

  if (linkError) {
    await supabase.from('students').delete().eq('id', data.id)
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
