import { requireStaff } from '@/lib/require-staff'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'family-documents'

// Admin download — signed URL for any document on this family's portal.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id, docId } = await params
  const admin = auth.admin
  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, guardian_id')
    .eq('id', docId)
    .maybeSingle()
  if (!doc || doc.guardian_id !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
  if (error || !signed) return NextResponse.json({ error: error?.message ?? 'Could not create link' }, { status: 400 })
  return NextResponse.redirect(signed.signedUrl)
}

// Admin removes any document on the family's portal.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id, docId } = await params
  const admin = auth.admin
  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, guardian_id')
    .eq('id', docId)
    .maybeSingle()
  if (!doc || doc.guardian_id !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin.storage.from(BUCKET).remove([doc.storage_path])
  const { error } = await admin.from('documents').delete().eq('id', docId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
