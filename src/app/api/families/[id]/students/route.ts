import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: guardian_id } = await params
  const { student_id, relationship } = await req.json()

  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { error } = await supabase.from('guardian_students').insert({
    guardian_id,
    student_id,
    relationship: relationship ?? 'parent',
    is_primary: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: guardian_id } = await params
  const { student_id } = await req.json()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('guardian_students')
    .delete()
    .eq('guardian_id', guardian_id)
    .eq('student_id', student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
