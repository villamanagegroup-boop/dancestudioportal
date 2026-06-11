import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('parties').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logActivity({
    action: 'party.created',
    targetTable: 'parties',
    targetId: data.id,
    targetLabel: data.contact_name ?? null,
  }, supabase)

  return NextResponse.json(data)
}
