import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'family-documents'

export async function POST(req: NextRequest) {
  // Upload as the effective guardian — the signed-in family, or the family the
  // owner/admin is viewing-as.
  const viewer = await getPortalViewer('g')
  const guardianId = viewer.effectiveId
  if (!guardianId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const documentType = String(formData.get('document_type') ?? 'other')
  const rawTitle = String(formData.get('title') ?? '').trim()
  const studentIdRaw = formData.get('student_id')
  const studentId = studentIdRaw ? String(studentIdRaw) : null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  // Fall back to the file's own name so general uploads aren't all "Document".
  const title = rawTitle || file.name.replace(/\.[^.]+$/, '') || 'Document'

  const admin = createAdminClient()

  // If tied to a student, confirm the guardian owns that student.
  if (studentId) {
    const { data: link } = await admin
      .from('guardian_students')
      .select('id')
      .eq('guardian_id', guardianId)
      .eq('student_id', studentId)
      .maybeSingle()
    if (!link) {
      return NextResponse.json({ error: 'That student is not on this account' }, { status: 403 })
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${guardianId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  const { error } = await admin.from('documents').insert({
    guardian_id: guardianId,
    student_id: studentId,
    title,
    document_type: documentType,
    storage_path: storagePath,
    source: 'family',
    uploaded_by: viewer.realUserId,
    signed_at: new Date().toISOString(),
  })
  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
