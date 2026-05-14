import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CalendarView from '@/components/admin/CalendarView'

type View = 'day' | 'week' | 'month'

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayOf(d: Date) {
  const x = new Date(d)
  const idx = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - idx)
  x.setHours(0, 0, 0, 0)
  return x
}

// The date range to fetch + the grid's first day, given a view + anchor
function computeRange(view: View, anchor: Date) {
  if (view === 'day') {
    const d = new Date(anchor); d.setHours(0, 0, 0, 0)
    return { gridStart: d, rangeStart: d, rangeEnd: d }
  }
  if (view === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    const gridStart = mondayOf(first)
    const gridEnd = new Date(gridStart); gridEnd.setDate(gridStart.getDate() + 41) // 6 weeks
    return { gridStart, rangeStart: gridStart, rangeEnd: gridEnd, monthFirst: first, monthLast: last }
  }
  // week
  const gridStart = mondayOf(anchor)
  const gridEnd = new Date(gridStart); gridEnd.setDate(gridStart.getDate() + 6)
  return { gridStart, rangeStart: gridStart, rangeEnd: gridEnd }
}

interface PageProps {
  searchParams: Promise<{ view?: string; date?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const view: View = sp.view === 'day' || sp.view === 'month' ? sp.view : 'week'
  const parsed = sp.date ? new Date(sp.date + 'T00:00:00') : new Date()
  const anchor = isNaN(parsed.getTime()) ? new Date() : parsed

  const { gridStart, rangeStart, rangeEnd } = computeRange(view, anchor)
  const rangeStartIso = iso(rangeStart)
  const rangeEndIso = iso(rangeEnd)

  const supabase = createAdminClient()
  const [
    { data: classes },
    { data: events },
    { data: camps },
    { data: parties },
    { data: bookings },
    { data: studioHours },
    { data: instructors },
    { data: rooms },
    { data: classTypes },
    { data: seasons },
  ] = await Promise.all([
    supabase.from('classes').select(`
      id, name, day_of_week, start_time, end_time, instructor_id, room_id,
      instructor:instructors(first_name, last_name),
      class_type:class_types(style, color),
      room:rooms(name)
    `).eq('active', true),
    supabase.from('calendar_events').select('*, room:rooms(name)')
      .lte('start_date', rangeEndIso)
      .or(`recurrence.eq.weekly,end_date.gte.${rangeStartIso},and(end_date.is.null,start_date.gte.${rangeStartIso})`),
    supabase.from('camps').select('id, name, start_date, end_date, start_time, end_time, room_id, room:rooms(name)')
      .lte('start_date', rangeEndIso).gte('end_date', rangeStartIso),
    supabase.from('parties').select('id, contact_name, event_date, start_time, end_time, room_id, status, room:rooms(name)')
      .gte('event_date', rangeStartIso).lte('event_date', rangeEndIso),
    supabase.from('bookings').select('id, title, booking_date, start_time, end_time, room_id, booking_type, status, room:rooms(name)')
      .gte('booking_date', rangeStartIso).lte('booking_date', rangeEndIso),
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
          view={view}
          anchor={iso(anchor)}
          gridStart={iso(gridStart)}
          classes={(classes ?? []) as any}
          events={(events ?? []) as any}
          camps={(camps ?? []) as any}
          parties={(parties ?? []) as any}
          bookings={(bookings ?? []) as any}
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
