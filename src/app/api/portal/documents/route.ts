import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'family-documents'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const documentType = String(formData.get('document_type') ?? 'other')
  const title = String(formData.get('title') ?? 'Document')
  const studentIdRaw = formData.get('student_id')
  const studentId = studentIdRaw ? String(studentIdRaw) : null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // If tied to a student, confirm the guardian owns that student
  if (studentId) {
    const { data: link } = await supabase
      .from('guardian_students')
      .select('id')
      .eq('guardian_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle()
    if (!link) {
      return NextResponse.json({ error: 'That student is not on your account' }, { status: 403 })
    }
  }

  const admin = createAdminClient()

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  const { error } = await admin.from('documents').insert({
    guardian_id: user.id,
    student_id: studentId,
    title,
    document_type: documentType,
    storage_path: storagePath,
    signed_at: new Date().toISOString(),
  })
  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
