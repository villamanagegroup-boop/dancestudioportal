import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_KEYS = ['studio_profile', 'parent_portal', 'staff_portal', 'finance']

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('studio_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const map: Record<string, any> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return NextResponse.json(map)
}

export async function PATCH(req: NextRequest) {
  const { key, value } = await req.json()
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Unknown settings key' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('studio_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
