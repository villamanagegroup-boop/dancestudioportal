import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { requireStaff } from '@/lib/require-staff'

export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const body = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('camps').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'camp.created',
    targetTable: 'camps',
    targetId: data.id,
    targetLabel: data.name ?? null,
  }, supabase)

  return NextResponse.json(data)
}
