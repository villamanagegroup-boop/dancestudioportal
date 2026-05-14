'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import CalendarCreateModal, { type SlotContext } from '@/components/forms/CalendarCreateModal'
import CalendarEventModal from '@/components/forms/CalendarEventModal'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CELL_PX = 60

interface ClassItem {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  instructor: { first_name: string; last_name: string } | null
  class_type: { style: string; color: string } | null
  room: { name: string } | null
}

interface CalEvent {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  all_day: boolean
  start_time: string | null
  end_time: string | null
  room_id: string | null
  notes: string | null
  room: { name: string } | null
}

interface StudioHour {
  day_of_week: string
  is_open: boolean
  open_time: string
  close_time: string
}

interface Props {
  weekStart: string
  classes: ClassItem[]
  events: CalEvent[]
  studioHours: StudioHour[]
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: { id: string; name: string }[]
}

const EVENT_COLORS: Record<string, string> = {
  blackout: '#ef4444',
  meeting: '#3b82f6',
  placeholder: '#94a3b8',
  event: '#8b5cf6',
}

function parseHour(t: string | null | undefined) {
  if (!t) return null
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh)) return null
  return hh + (mm || 0) / 60
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarView({
  weekStart, classes, events, studioHours, instructors, rooms, classTypes, seasons,
}: Props) {
  const router = useRouter()
  const [createCtx, setCreateCtx] = useState<SlotContext | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)

  const weekStartDate = new Date(weekStart + 'T00:00:00')
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return d
  })
  const todayIso = iso(new Date())
  const todayIdx = weekDates.findIndex(d => iso(d) === todayIso)

  // Visible hour range from studio hours
  const openDays = studioHours.filter(s => s.is_open)
  const opens = openDays.map(s => parseHour(s.open_time)).filter((n): n is number => n != null)
  const closes = openDays.map(s => parseHour(s.close_time)).filter((n): n is number => n != null)
  const START_HOUR = opens.length ? Math.floor(Math.min(...opens)) : 9
  const END_HOUR = closes.length ? Math.ceil(Math.max(...closes)) : 21
  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  const closedByDay = new Map(studioHours.map(s => [s.day_of_week, !s.is_open]))

  // Split events into all-day/multi-day band vs timed in-grid
  const bandEvents = events.filter(e => e.all_day || (e.end_date && e.end_date !== e.start_date))
  const timedEvents = events.filter(e => !e.all_day && (!e.end_date || e.end_date === e.start_date) && e.start_time)

  function shiftWeek(deltaDays: number) {
    const d = new Date(weekStartDate)
    d.setDate(d.getDate() + deltaDays)
    router.push(`/calendar?week=${iso(d)}`)
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  function dayIndexOf(dateStr: string) {
    return weekDates.findIndex(d => iso(d) === dateStr)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div>
          <div className="eyebrow">Week of</div>
          <h1 className="h1">{weekLabel}</h1>
        </div>
        <div className="ml-auto flex gap-2 items-center">
          <button onClick={() => shiftWeek(-7)} className="btn btn-ghost btn-sm" aria-label="Previous week"><ChevronLeft size={14} /></button>
          <button onClick={() => router.push('/calendar')} className="btn btn-ghost btn-sm">Today</button>
          <button onClick={() => shiftWeek(7)} className="btn btn-ghost btn-sm" aria-label="Next week"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="glass card" style={{ padding: 18, overflow: 'auto' }}>
        {/* All-day / multi-day band */}
        {bandEvents.length > 0 && (
          <div style={{ minWidth: 900, marginBottom: 8 }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 mb-1" style={{ paddingLeft: 56 }}>
              All-day &amp; multi-day
            </div>
            <div className="space-y-1">
              {bandEvents.map(ev => {
                const s = Math.max(0, dayIndexOf(ev.start_date))
                const rawEnd = ev.end_date ? dayIndexOf(ev.end_date) : dayIndexOf(ev.start_date)
                const e = rawEnd < 0 ? 6 : Math.min(6, rawEnd)
                const start = dayIndexOf(ev.start_date) < 0 ? 0 : s
                const span = Math.max(1, e - start + 1)
                const color = EVENT_COLORS[ev.event_type] ?? '#8b5cf6'
                return (
                  <div key={ev.id} style={{ position: 'relative', height: 26 }}>
                    <button
                      onClick={() => setEditEvent(ev)}
                      title={ev.title}
                      style={{
                        position: 'absolute',
                        left: `calc(56px + ${start} * ((100% - 56px) / 7))`,
                        width: `calc(${span} * ((100% - 56px) / 7) - 4px)`,
                        height: 22,
                        background: color,
                        color: 'white',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '0 8px',
                        textAlign: 'left',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ev.title}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="schedule" style={{ minWidth: 900, position: 'relative' }}>
          <div className="sch-head" />
          {DAY_LABELS.map((label, i) => (
            <div key={label} className={`sch-head ${i === todayIdx ? 'today' : ''}`}>
              {label}
              <span className="dn">{weekDates[i].getDate()}</span>
            </div>
          ))}

          {/* Time column */}
          <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column' }}>
            {hours.map(h => (
              <div key={h} className="sch-time">{h % 12 === 0 ? 12 : h % 12} {h < 12 ? 'AM' : 'PM'}</div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((dayKey, di) => {
            const dayClasses = classes.filter(c => c.day_of_week === dayKey)
            const dayEvents = timedEvents.filter(e => iso(weekDates[di]) === e.start_date)
            const closed = closedByDay.get(dayKey)
            return (
              <div
                key={dayKey}
                className="sch-col"
                style={{ gridColumn: di + 2, display: 'flex', flexDirection: 'column', background: closed ? 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.025) 6px, rgba(0,0,0,0.025) 12px)' : undefined }}
              >
                {hours.map(h => (
                  <div
                    key={h}
                    className="sch-grid cursor-pointer hover:bg-studio-50"
                    onClick={() => setCreateCtx({
                      date: iso(weekDates[di]),
                      dayOfWeek: dayKey,
                      time: `${String(h).padStart(2, '0')}:00`,
                    })}
                  />
                ))}

                {dayClasses.map(c => {
                  const start = parseHour(c.start_time)
                  const end = parseHour(c.end_time)
                  if (start == null) return null
                  const dur = end != null ? Math.max(0.5, end - start) : 1
                  return (
                    <Link
                      key={c.id}
                      href={`/classes/${c.id}`}
                      className="sch-event"
                      style={{
                        top: (start - START_HOUR) * CELL_PX + 2,
                        height: dur * CELL_PX - 4,
                        background: c.class_type?.color ?? '#7c3aed',
                      }}
                    >
                      <div className="e-t">{c.name}</div>
                      {c.instructor && <div className="e-s">{c.instructor.first_name} {c.instructor.last_name}</div>}
                      {c.room?.name && <div className="e-r">{c.room.name}</div>}
                    </Link>
                  )
                })}

                {dayEvents.map(ev => {
                  const start = parseHour(ev.start_time)
                  const end = parseHour(ev.end_time)
                  if (start == null) return null
                  const dur = end != null ? Math.max(0.5, end - start) : 1
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setEditEvent(ev)}
                      className="sch-event"
                      style={{
                        top: (start - START_HOUR) * CELL_PX + 2,
                        height: dur * CELL_PX - 4,
                        background: EVENT_COLORS[ev.event_type] ?? '#8b5cf6',
                        textAlign: 'left',
                      }}
                    >
                      <div className="e-t">{ev.title}</div>
                      <div className="e-s capitalize">{ev.event_type}</div>
                      {ev.room?.name && <div className="e-r">{ev.room.name}</div>}
                    </button>
                  )
                })}

                {di === todayIdx && (() => {
                  const now = new Date()
                  const nowHour = now.getHours() + now.getMinutes() / 60
                  if (nowHour < START_HOUR || nowHour > END_HOUR) return null
                  return (
                    <div
                      className="now-line"
                      style={{ top: (nowHour - START_HOUR) * CELL_PX, left: 0, right: 0, position: 'absolute' }}
                    />
                  )
                })()}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Click an empty slot to add a class, camp, event, meeting, or blackout. Hatched columns are days the studio is closed.
        </p>
      </div>

      {createCtx && (
        <CalendarCreateModal
          onClose={() => setCreateCtx(null)}
          context={createCtx}
          instructors={instructors}
          rooms={rooms}
          classTypes={classTypes}
          seasons={seasons}
        />
      )}
      {editEvent && (
        <CalendarEventModal
          onClose={() => setEditEvent(null)}
          rooms={rooms}
          event={editEvent}
        />
      )}
    </div>
  )
}
