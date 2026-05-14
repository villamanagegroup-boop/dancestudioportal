import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CalendarView from '@/components/admin/CalendarView'

function mondayOf(d: Date) {
  const x = new Date(d)
  const idx = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - idx)
  x.setHours(0, 0, 0, 0)
  return x
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface PageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const base = sp.week ? new Date(sp.week + 'T00:00:00') : new Date()
  const weekStart = mondayOf(isNaN(base.getTime()) ? new Date() : base)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartIso = iso(weekStart)
  const weekEndIso = iso(weekEnd)

  const supabase = createAdminClient()
  const [
    { data: classes },
    { data: events },
    { data: studioHours },
    { data: instructors },
    { data: rooms },
    { data: classTypes },
    { data: seasons },
  ] = await Promise.all([
    supabase.from('classes').select(`
      id, name, day_of_week, start_time, end_time,
      instructor:instructors(first_name, last_name),
      class_type:class_types(style, color),
      room:rooms(name)
    `).eq('active', true),
    supabase.from('calendar_events').select('*, room:rooms(name)')
      .lte('start_date', weekEndIso)
      .or(`end_date.gte.${weekStartIso},and(end_date.is.null,start_date.gte.${weekStartIso})`),
    supabase.from('studio_hours').select('*'),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('last_name'),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    supabase.from('class_types').select('id, name, style').eq('active', true).order('name'),
    supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Schedule" subtitle="Studio calendar" />
      <div className="p-6">
        <CalendarView
          weekStart={weekStartIso}
          classes={(classes ?? []) as any}
          events={(events ?? []) as any}
          studioHours={(studioHours ?? []) as any}
          instructors={instructors ?? []}
          rooms={rooms ?? []}
          classTypes={classTypes ?? []}
          seasons={seasons ?? []}
        />
      </div>
    </div>
  )
}
