import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'admin-docs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { id } = await params
  const { data: doc } = await admin.from('admin_documents').select('file_path, name').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.file_path, 60)
  if (error || !signed) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
