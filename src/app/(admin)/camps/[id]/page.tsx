import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import CampDetail from '@/components/admin/CampDetail'

export default async function CampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [
    { data: camp },
    { data: registrations },
    { data: attendance },
    { data: itinerary },
    { data: files },
    { data: instructors },
    { data: rooms },
    { data: students },
  ] = await Promise.all([
    supabase.from('camps').select(`
      *, instructor:instructors(first_name, last_name), room:rooms(name)
    `).eq('id', id).single(),
    supabase.from('camp_registrations').select(`
      id, status, payment_status, amount_paid, waitlist_position, notes, archived, registered_at,
      student:students(id, first_name, last_name, date_of_birth)
    `).eq('camp_id', id).order('registered_at'),
    supabase.from('camp_attendance').select('student_id, attend_date, present').eq('camp_id', id),
    supabase.from('camp_itinerary').select('*').eq('camp_id', id)
      .order('day_date').order('sort_order'),
    supabase.from('camp_files').select('id, name, category, storage_path, size_bytes, mime_type, created_at')
      .eq('camp_id', id).order('created_at', { ascending: false }),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('last_name'),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    supabase.from('students').select('id, first_name, last_name, date_of_birth')
      .eq('active', true).order('last_name'),
  ])

  if (!camp) notFound()

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async f => {
      const { data } = await supabase.storage.from('camp-files').createSignedUrl(f.storage_path, 3600)
      return { ...f, url: data?.signedUrl ?? null }
    }),
  )

  return (
    <div className="flex flex-col h-full">
      <Header title={camp.name} subtitle="Camp details" />
      <div className="p-6">
        <CampDetail
          camp={camp}
          registrations={(registrations ?? []) as any}
          attendance={(attendance ?? []) as any}
          itinerary={(itinerary ?? []) as any}
          files={filesWithUrls as any}
          instructors={instructors ?? []}
          rooms={rooms ?? []}
          students={students ?? []}
        />
      </div>
    </div>
  )
}
