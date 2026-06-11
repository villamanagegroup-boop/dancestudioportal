import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('policies').select('*').order('sort_order').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: last } = await supabase.from('policies').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextOrder = (last?.sort_order ?? 0) + 1

  // Ensure a unique slug.
  let slug = slugify(body.slug || body.name)
  const { data: existing } = await supabase.from('policies').select('id').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}_${nextOrder}`

  const { data, error } = await supabase.from('policies').insert({
    name: body.name.trim(),
    body: body.body ?? null,
    category: body.category?.trim() || null,
    required: !!body.required,
    active: body.active ?? true,
    version: 1,
    sort_order: nextOrder,
    slug,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
