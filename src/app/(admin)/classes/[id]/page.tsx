import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import ClassDetail from '@/components/admin/ClassDetail'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: cls }, { data: enrollments }] = await Promise.all([
    supabase.from('classes').select(`
      *, instructor:instructors(first_name, last_name),
      room:rooms(name), class_type:class_types(name, style, color),
      season:seasons(name)
    `).eq('id', id).single(),
    supabase.from('enrollments').select(`
      id, status, enrolled_at,
      student:students(id, first_name, last_name, date_of_birth)
    `).eq('class_id', id).order('enrolled_at'),
  ])

  if (!cls) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header title={cls.name} subtitle={`${cls.class_type?.style ?? ''} · ${cls.season?.name ?? ''}`} />
      <div className="p-6">
        <ClassDetail cls={cls} enrollments={(enrollments ?? []) as any} />
      </div>
    </div>
  )
}
