import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import Link from 'next/link'
import { formatTime } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const DAYS = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  { key: 'saturday',  label: 'Sat' },
  { key: 'sunday',    label: 'Sun' },
]

const START_HOUR = 9
const END_HOUR = 21
const CELL_PX = 60 // px per hour

function fmtHour(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${h < 12 ? 'AM' : 'PM'}`
}

function parseHour(t: string | null | undefined) {
  if (!t) return null
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh)) return null
  return hh + (mm || 0) / 60
}

// Pick a gradient class for an event based on its style or fallback by index
function eventColorFor(style: string | undefined, fallbackIdx: number) {
  const s = (style ?? '').toLowerCase()
  if (s.includes('ballet') || s.includes('pointe')) return 'ev-1'
  if (s.includes('hip') || s.includes('street')) return 'ev-2'
  if (s.includes('contemp') || s.includes('lyrical')) return 'ev-3'
  if (s.includes('jazz') || s.includes('tap')) return 'ev-4'
  if (s.includes('salsa') || s.includes('latin') || s.includes('ballroom')) return 'ev-5'
  return ['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5'][fallbackIdx % 5]
}

// Build the date headers for the current ISO week (Mon → Sun)
function buildWeekDates(today: Date) {
  const d = new Date(today)
  // Monday=1..Sunday=7; getDay() returns Sun=0..Sat=6
  const dayIdx = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayIdx)
  return DAYS.map((_, i) => {
    const nd = new Date(d)
    nd.setDate(d.getDate() + i)
    return nd
  })
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()
  const params = await searchParams
  const filter = params?.filter ?? 'all'

  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id, name, day_of_week, start_time, end_time, max_students,
      instructor:instructors(first_name, last_name),
      class_type:class_types(style, color),
      room:rooms(name)
    `)
    .eq('active', true)
    .order('start_time')

  const filtered = (classes ?? []).filter((c: any) => {
    if (filter === 'all') return true
    if (filter === 'rehearsals') return /rehearsal|run|showcase/i.test(c.name ?? '')
    if (filter === 'today') {
      const todayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
      return c.day_of_week === todayKey
    }
    return true
  })

  const today = new Date()
  const todayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][today.getDay()]
  const todayIdx = DAYS.findIndex(d => d.key === todayKey)
  const weekDates = buildWeekDates(today)

  const nowHour = today.getHours() + today.getMinutes() / 60
  const showNowLine = nowHour >= START_HOUR && nowHour <= END_HOUR

  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="flex flex-col h-full">
      <Header title="Schedule" subtitle={`Week of ${weekLabel}`} />
      <div className="p-6 space-y-4 overflow-auto">

        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <div className="eyebrow">Week of {weekLabel}</div>
            <h1 className="h1">Schedule</h1>
          </div>
          <div className="ml-auto flex gap-2 items-center flex-wrap">
            <div className="role-switch">
              {[
                { k: 'all', l: 'All classes' },
                { k: 'today', l: 'Today only' },
                { k: 'rehearsals', l: 'Rehearsals' },
              ].map(({ k, l }) => (
                <Link key={k} href={`/calendar?filter=${k}`} className="block">
                  <button aria-pressed={filter === k}>{l}</button>
                </Link>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" aria-label="Previous week"><ChevronLeft size={14} /></button>
            <Link href="/calendar" className="btn btn-ghost btn-sm">Today</Link>
            <button className="btn btn-ghost btn-sm" aria-label="Next week"><ChevronRight size={14} /></button>
            <Link href="/classes" className="btn btn-primary btn-sm">
              <Plus size={14} /> New class
            </Link>
          </div>
        </div>

        <div className="glass card" style={{ padding: 18, overflow: 'auto' }}>
          <div className="schedule" style={{ minWidth: 900, position: 'relative' }}>
            {/* Header row */}
            <div className="sch-head" />
            {DAYS.map((d, i) => (
              <div key={d.key} className={`sch-head ${i === todayIdx ? 'today' : ''}`}>
                {d.label}
                <span className="dn">{weekDates[i].getDate()}</span>
              </div>
            ))}

            {/* Time column */}
            <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column' }}>
              {hours.map(h => (
                <div key={h} className="sch-time">{fmtHour(h)}</div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((d, di) => {
              const dayClasses = filtered.filter((c: any) => c.day_of_week === d.key)
              return (
                <div key={d.key} className="sch-col" style={{ gridColumn: di + 2, display: 'flex', flexDirection: 'column' }}>
                  {hours.map(h => <div key={h} className="sch-grid" />)}
                  {dayClasses.map((c: any, i: number) => {
                    const start = parseHour(c.start_time)
                    const end = parseHour(c.end_time)
                    if (start == null) return null
                    const dur = end != null ? Math.max(0.5, end - start) : 1
                    const top = (start - START_HOUR) * CELL_PX
                    const height = dur * CELL_PX - 4
                    const colorClass = eventColorFor(c.class_type?.style, i)
                    return (
                      <Link
                        key={c.id}
                        href={`/classes/${c.id}`}
                        className={`sch-event ${colorClass}`}
                        style={{ top: top + 2, height }}
                      >
                        <div className="e-t">{c.name}</div>
                        {c.instructor && (
                          <div className="e-s">{c.instructor.first_name} {c.instructor.last_name}</div>
                        )}
                        {c.room?.name && <div className="e-r">{c.room.name}</div>}
                      </Link>
                    )
                  })}
                </div>
              )
            })}

            {/* Now line — today only */}
            {showNowLine && todayIdx >= 0 && (
              <div
                className="now-line"
                style={{
                  top: 50 + (nowHour - START_HOUR) * CELL_PX,
                  left: `calc(56px + (100% - 56px) * ${todayIdx} / 7)`,
                  width: `calc((100% - 56px) / 7)`,
                  position: 'absolute',
                }}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-thin card" style={{ padding: '14px 18px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="eyebrow" style={{ margin: 0 }}>Studio key</div>
          {[
            { k: 'ev-1', l: 'Ballet', bg: 'linear-gradient(135deg, #7c5cff, #4f7bff)' },
            { k: 'ev-2', l: 'Hip-Hop', bg: 'linear-gradient(135deg, #ff6bd6, #b855ff)' },
            { k: 'ev-3', l: 'Contemporary', bg: 'linear-gradient(135deg, #4cc9ff, #4f7bff)' },
            { k: 'ev-4', l: 'Jazz / Tap', bg: 'linear-gradient(135deg, #34d399, #06b6d4)' },
            { k: 'ev-5', l: 'Latin / Social', bg: 'linear-gradient(135deg, #fb923c, #ec4899)' },
          ].map(({ k, l, bg }) => (
            <div key={k} className="row-gap">
              <span className="dot-sm" style={{ width: 10, height: 10, background: bg }} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{l}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }}>
            Click any class to view its roster
          </div>
        </div>
      </div>
    </div>
  )
}
