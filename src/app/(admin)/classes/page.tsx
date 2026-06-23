import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import ClassesView from '@/components/admin/ClassesView'

export default async function ClassesPage() {
  const supabase = createAdminClient()
  const [{ data: classes }, { data: instructors }, { data: rooms }, { data: classTypes }, { data: seasons }, { data: enrollments }] = await Promise.all([
    supabase.from('classes').select(`
      *, instructor:instructors(first_name, last_name),
      room:rooms(name), class_type:class_types(name, style, color)
    `).order('day_of_week').order('start_time'),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true),
    supabase.from('rooms').select('id, name').eq('active', true),
    supabase.from('class_types').select('*').eq('active', true),
    supabase.from('seasons').select('*').eq('active', true),
    // Live roster counts. Everything except dropped/completed/archived counts
    // toward "enrolled" — so active, pending, waitlisted, and trials are all included.
    supabase.from('enrollments').select('class_id, status, archived')
      .not('status', 'in', '(dropped,completed)'),
  ])

  // class_id -> number enrolled (active + pending + waitlisted + trials)
  const enrolledByClass = new Map<string, number>()
  for (const e of enrollments ?? []) {
    if (e.archived || !e.class_id) continue
    enrolledByClass.set(e.class_id, (enrolledByClass.get(e.class_id) ?? 0) + 1)
  }
  const classesWithCounts = (classes ?? []).map((c) => ({ ...c, enrolled: enrolledByClass.get(c.id) ?? 0 }))

  return (
    <div className="flex flex-col h-full">
      <Header title="Classes" subtitle="Schedule and manage class offerings" />
      <div className="p-6">
        <ClassesView
          classes={classesWithCounts}
          instructors={instructors ?? []}
          rooms={rooms ?? []}
          classTypes={classTypes ?? []}
          seasons={seasons ?? []}
        />
      </div>
    </div>
  )
}
