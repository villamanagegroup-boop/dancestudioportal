import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  if (!body.first_name || !body.last_name || !body.email) {
    return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('instructors').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'staff.created',
    targetTable: 'instructors',
    targetId: data.id,
    targetLabel: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || null,
  }, supabase)

  return NextResponse.json(data)
}
