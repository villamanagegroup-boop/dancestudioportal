import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'camp-files'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: campId, fileId } = await params
  const supabase = createAdminClient()

  const { data: file, error: fetchErr } = await supabase
    .from('camp_files')
    .select('storage_path')
    .eq('id', fileId)
    .eq('camp_id', campId)
    .single()
  if (fetchErr || !file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  await supabase.storage.from(BUCKET).remove([file.storage_path])

  const { error } = await supabase.from('camp_files').delete().eq('id', fileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
