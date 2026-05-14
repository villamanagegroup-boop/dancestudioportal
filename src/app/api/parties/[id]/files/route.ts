import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'party-files'
const VALID_CATEGORIES = ['contract', 'invoice', 'agreement', 'floor_plan', 'document', 'other']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: partyId } = await params
  const formData = await req.formData()
  const file = formData.get('file')
  const category = String(formData.get('category') ?? 'document')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${partyId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  const { data, error } = await supabase
    .from('party_files')
    .insert({
      party_id: partyId,
      name: file.name,
      category,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select('id')
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
