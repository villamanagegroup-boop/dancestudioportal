import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_memberships')
    .delete()
    .eq('id', membershipId)
    .eq('student_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('student_activity_log').insert({
    student_id: id,
    action: 'membership_removed',
    meta: { membership_id: membershipId },
  })

  return NextResponse.json({ ok: true })
}
