'use client'

import { useState } from 'react'
import { iso, parseHour, type CalItem } from '@/lib/calendar'

const CELL_PX = 60

interface StudioHour {
  day_of_week: string
  is_open: boolean
  open_time: string
  close_time: string
}

interface Props {
  dates: Date[]
  bandItems: CalItem[]
  timedItems: CalItem[]
  studioHours: StudioHour[]
  conflicts: Set<string>
  onSlotClick: (date: Date, hour: number) => void
  onItemClick: (item: CalItem) => void
  onItemDrop: (item: CalItem, date: Date, hour: number) => void
}

export default function CalendarTimeGrid({
  dates, bandItems, timedItems, studioHours, conflicts, onSlotClick, onItemClick, onItemDrop,
}: Props) {
  const [drag, setDrag] = useState<CalItem | null>(null)

  const openDays = studioHours.filter(s => s.is_open)
  const opens = openDays.map(s => parseHour(s.open_time)).filter((n): n is number => n != null)
  const closes = openDays.map(s => parseHour(s.close_time)).filter((n): n is number => n != null)
  const START_HOUR = opens.length ? Math.floor(Math.min(...opens)) : 9
  const END_HOUR = closes.length ? Math.ceil(Math.max(...closes)) : 21
  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  const closedByDay = new Map(studioHours.map(s => [s.day_of_week, !s.is_open]))
  const todayIso = iso(new Date())
  const dateKeys = dates.map(iso)
  const cols = dates.length

  function colSpanStyle(item: CalItem): React.CSSProperties {
    const s = Math.max(0, dateKeys.indexOf(item.startDate))
    const rawE = dateKeys.indexOf(item.endDate)
    const e = rawE < 0 ? cols - 1 : Math.min(cols - 1, rawE)
    const span = Math.max(1, e - s + 1)
    return {
      position: 'absolute',
      left: `calc(56px + ${s} * ((100% - 56px) / ${cols}))`,
      width: `calc(${span} * ((100% - 56px) / ${cols}) - 4px)`,
    }
  }

  return (
    <div style={{ minWidth: cols > 1 ? 900 : 320 }}>
      {/* All-day / multi-day band */}
      {bandItems.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 mb-1" style={{ paddingLeft: 56 }}>
            All-day &amp; multi-day
          </div>
          <div className="space-y-1">
            {bandItems.map(item => (
              <div key={item.key} style={{ position: 'relative', height: 26 }}>
                <button
                  onClick={() => onItemClick(item)}
                  title={item.title}
                  style={{
                    ...colSpanStyle(item),
                    height: 22,
                    background: item.color,
                    color: 'white',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '0 8px',
                    textAlign: 'left',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    outline: conflicts.has(item.key) ? '2px solid #ef4444' : undefined,
                  }}
                >
                  {item.title}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="schedule" style={{ gridTemplateColumns: `56px repeat(${cols}, minmax(0, 1fr))`, position: 'relative' }}>
        <div className="sch-head" />
        {dates.map((d, i) => (
          <div key={i} className={`sch-head ${iso(d) === todayIso ? 'today' : ''}`}>
            {d.toLocaleDateString('en-US', { weekday: 'short' })}
            <span className="dn">{d.getDate()}</span>
          </div>
        ))}

        {/* Time column */}
        <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column' }}>
          {hours.map(h => (
            <div key={h} className="sch-time">{h % 12 === 0 ? 12 : h % 12} {h < 12 ? 'AM' : 'PM'}</div>
          ))}
        </div>

        {/* Day columns */}
        {dates.map((date, di) => {
          const dayKey = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][(date.getDay() + 6) % 7]
          const closed = closedByDay.get(dayKey)
          const dayItems = timedItems.filter(it => it.startDate === iso(date))
          const isToday = iso(date) === todayIso
          const now = new Date()
          const nowHour = now.getHours() + now.getMinutes() / 60
          return (
            <div
              key={di}
              className="sch-col"
              style={{
                gridColumn: di + 2,
                display: 'flex',
                flexDirection: 'column',
                background: closed
                  ? 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.025) 6px, rgba(0,0,0,0.025) 12px)'
                  : undefined,
              }}
            >
              {hours.map(h => (
                <div
                  key={h}
                  className="sch-grid cursor-pointer hover:bg-studio-50"
                  onClick={() => onSlotClick(date, h)}
                  onDragOver={e => { if (drag) e.preventDefault() }}
                  onDrop={() => { if (drag) { onItemDrop(drag, date, h); setDrag(null) } }}
                />
              ))}

              {dayItems.map(item => {
                if (item.startHour == null) return null
                const dur = item.endHour != null ? Math.max(0.5, item.endHour - item.startHour) : 1
                const style: React.CSSProperties = {
                  top: (item.startHour - START_HOUR) * CELL_PX + 2,
                  height: dur * CELL_PX - 4,
                  background: item.color,
                  textAlign: 'left',
                  outline: conflicts.has(item.key) ? '2px solid #fff' : undefined,
                  boxShadow: conflicts.has(item.key) ? '0 0 0 4px #ef4444' : undefined,
                }
                return (
                  <div
                    key={item.key}
                    className="sch-event"
                    style={style}
                    draggable={item.draggable}
                    onDragStart={() => item.draggable && setDrag(item)}
                    onDragEnd={() => setDrag(null)}
                    onClick={() => onItemClick(item)}
                  >
                    <div className="e-t">{item.title}</div>
                    {item.subtitle && <div className="e-s">{item.subtitle}</div>}
                    {item.roomName && <div className="e-r">{item.roomName}</div>}
                  </div>
                )
              })}

              {isToday && nowHour >= START_HOUR && nowHour <= END_HOUR && (
                <div className="now-line" style={{ top: (nowHour - START_HOUR) * CELL_PX, left: 0, right: 0, position: 'absolute' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
