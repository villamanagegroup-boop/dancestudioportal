import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const guardianId = searchParams.get('guardian_id')
  const studentId = searchParams.get('student_id')
  const status = searchParams.get('status')

  let query = supabase.from('invoices').select(`
    *, guardian:profiles(first_name, last_name, email),
    student:students(first_name, last_name)
  `)

  if (guardianId) query = query.eq('guardian_id', guardianId)
  if (studentId) query = query.eq('student_id', studentId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase.from('invoices').insert({
    guardian_id: body.guardian_id,
    student_id: body.student_id ?? null,
    enrollment_id: body.enrollment_id ?? null,
    invoice_type: body.invoice_type ?? 'tuition',
    description: body.description,
    amount: body.amount,
    due_date: body.due_date ?? null,
    notes: body.notes ?? null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
