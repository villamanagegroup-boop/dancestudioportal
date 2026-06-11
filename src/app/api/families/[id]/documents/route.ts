import { requireStaff } from '@/lib/require-staff'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'family-documents'

// List every document on a family's portal (studio-shared + family-uploaded).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const admin = auth.admin
  const { data, error } = await admin
    .from('documents')
    .select('id, title, document_type, description, source, signed_at, student_id')
    .eq('guardian_id', id)
    .order('signed_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ documents: data ?? [] })
}

// Staff places a document into the family's portal (source = 'studio').
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params
  const admin = auth.admin

  const formData = await req.formData()
  const file = formData.get('file')
  const description = String(formData.get('description') ?? '').trim() || null
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  const title = String(formData.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/, '') || 'Document'

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${id}/studio-${crypto.randomUUID()}-${safeName}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  const { error } = await admin.from('documents').insert({
    guardian_id: id,
    title,
    document_type: 'studio',
    description,
    storage_path: storagePath,
    source: 'studio',
    uploaded_by: auth.userId,
    signed_at: new Date().toISOString(),
  })
  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await admin.from('family_activity_log').insert({
    guardian_id: id,
    action: 'document_shared',
    meta: { title },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
