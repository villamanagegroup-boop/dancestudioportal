import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'family-documents'

// Download a document — issues a short-lived signed URL, but only for a doc that
// belongs to the effective guardian (the signed-in family, or the family the
// owner/admin is viewing-as).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getPortalViewer('g')
  if (!viewer.effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, guardian_id')
    .eq('id', id)
    .maybeSingle()
  if (!doc || doc.guardian_id !== viewer.effectiveId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
  if (error || !signed) return NextResponse.json({ error: error?.message ?? 'Could not create link' }, { status: 400 })

  return NextResponse.redirect(signed.signedUrl)
}

// A family removes a document they uploaded (not studio-shared ones).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getPortalViewer('g')
  if (!viewer.effectiveId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, guardian_id, source')
    .eq('id', id)
    .maybeSingle()
  if (!doc || doc.guardian_id !== viewer.effectiveId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (doc.source === 'studio') {
    return NextResponse.json({ error: 'This document was shared by the studio and can only be removed by staff.' }, { status: 403 })
  }

  await admin.storage.from(BUCKET).remove([doc.storage_path])
  const { error } = await admin.from('documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
