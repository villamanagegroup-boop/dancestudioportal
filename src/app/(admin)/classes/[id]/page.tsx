import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import ClassDetail from '@/components/admin/ClassDetail'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [
    { data: cls },
    { data: enrollments },
    { data: instructors },
    { data: rooms },
    { data: classTypes },
    { data: seasons },
    { data: students },
    { data: sessions },
    { data: communications },
    { data: files },
  ] = await Promise.all([
    supabase.from('classes').select(`
      *, instructor:instructors(first_name, last_name),
      room:rooms(name), class_type:class_types(name, style, color),
      season:seasons(name)
    `).eq('id', id).single(),
    supabase.from('enrollments').select(`
      id, status, enrolled_at,
      student:students(id, first_name, last_name, date_of_birth)
    `).eq('class_id', id).order('enrolled_at'),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('last_name'),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    supabase.from('class_types').select('id, name, style').eq('active', true).order('name'),
    supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
    supabase.from('students').select('id, first_name, last_name, date_of_birth')
      .eq('active', true).order('last_name'),
    supabase.from('class_sessions').select('id, session_date, notes, attendance(student_id, present)')
      .eq('class_id', id).order('session_date', { ascending: false }),
    supabase.from('communications').select('id, subject, body, comm_type, sent_at, created_at')
      .eq('target_class_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('class_files').select('id, name, category, storage_path, size_bytes, mime_type, created_at')
      .eq('class_id', id).order('created_at', { ascending: false }),
  ])

  if (!cls) notFound()

  // Sign URLs for file downloads (1 hour)
  const filesWithUrls = await Promise.all(
    (files ?? []).map(async f => {
      const { data } = await supabase.storage.from('class-files').createSignedUrl(f.storage_path, 3600)
      return { ...f, url: data?.signedUrl ?? null }
    }),
  )

  return (
    <div className="flex flex-col h-full">
      <Header title={cls.name} subtitle={`${cls.class_type?.style ?? ''} · ${cls.season?.name ?? 'Standalone'}`} />
      <div className="p-6">
        <ClassDetail
          cls={cls}
          enrollments={(enrollments ?? []) as any}
          instructors={instructors ?? []}
          rooms={rooms ?? []}
          classTypes={classTypes ?? []}
          seasons={seasons ?? []}
          students={students ?? []}
          sessions={(sessions ?? []) as any}
          communications={(communications ?? []) as any}
          files={filesWithUrls as any}
        />
      </div>
    </div>
  )
}
