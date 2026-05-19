import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'admin-docs'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: 'Not signed in' }
  const admin = createAdminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { ok: false as const, status: 403, message: 'Admins only' }
  return { ok: true as const, userId: user.id, admin }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { data } = await auth.admin
    .from('admin_documents')
    .select('id, name, category, description, file_path, file_size, mime_type, uploaded_at, uploaded_by:profiles!admin_documents_uploaded_by_fkey(first_name, last_name)')
    .order('uploaded_at', { ascending: false })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const name = (form.get('name') as string)?.trim()
  const category = (form.get('category') as string)?.trim() || 'general'
  const description = (form.get('description') as string)?.trim() || null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filePath = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await auth.admin.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadErr) {
    return NextResponse.json({
      error: `Storage upload failed: ${uploadErr.message}. Make sure bucket '${BUCKET}' exists.`,
    }, { status: 500 })
  }

  const { data: row, error: dbErr } = await auth.admin.from('admin_documents').insert({
    name,
    category,
    description,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: auth.userId,
  }).select('id').single()

  if (dbErr) {
    await auth.admin.storage.from(BUCKET).remove([filePath])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: row.id })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: doc } = await auth.admin.from('admin_documents').select('file_path').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await auth.admin.storage.from(BUCKET).remove([doc.file_path])
  await auth.admin.from('admin_documents').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
