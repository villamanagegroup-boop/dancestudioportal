import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const FIELDS = ['name', 'body', 'category', 'required', 'active', 'sort_order'] as const

// PATCH: edit a policy. Pass bumpVersion:true to publish a new version,
// which makes existing acceptances "outdated" and re-prompts families.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  for (const f of FIELDS) {
    if (f in body) update[f] = f === 'category' ? (body[f]?.trim() || null) : body[f]
  }

  if (body.bumpVersion) {
    const { data: cur } = await supabase.from('policies').select('version').eq('id', id).single()
    if (!cur) return NextResponse.json({ error: 'policy not found' }, { status: 404 })
    update.version = (cur.version ?? 1) + 1
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('policies').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// DELETE: archive (deactivate) — keeps acceptance history intact.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('policies').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
