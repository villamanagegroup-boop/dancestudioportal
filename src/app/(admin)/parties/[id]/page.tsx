import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import PartyDetail from '@/components/admin/PartyDetail'

export default async function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [
    { data: party },
    { data: tasks },
    { data: files },
    { data: rooms },
    { data: guardians },
    { data: students },
  ] = await Promise.all([
    supabase.from('parties').select('*, room:rooms(name)').eq('id', id).single(),
    supabase.from('party_tasks').select('id, title, done, sort_order')
      .eq('party_id', id).order('sort_order'),
    supabase.from('party_files').select('id, name, category, storage_path, size_bytes, mime_type, created_at')
      .eq('party_id', id).order('created_at', { ascending: false }),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'parent').order('last_name'),
    supabase.from('students').select('id, first_name, last_name').eq('active', true).order('last_name'),
  ])

  if (!party) notFound()

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async f => {
      const { data } = await supabase.storage.from('party-files').createSignedUrl(f.storage_path, 3600)
      return { ...f, url: data?.signedUrl ?? null }
    }),
  )

  const guardianOptions = (guardians ?? []).map(g => ({
    id: g.id,
    label: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || g.email,
  }))

  return (
    <div className="flex flex-col h-full">
      <Header title={party.contact_name || 'Event'} subtitle="Party & event details" />
      <div className="p-6">
        <PartyDetail
          party={party}
          tasks={(tasks ?? []) as any}
          files={filesWithUrls as any}
          rooms={rooms ?? []}
          guardians={guardianOptions}
          students={students ?? []}
        />
      </div>
    </div>
  )
}
