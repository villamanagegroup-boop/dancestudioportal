'use client'

import { iso, DAY_LABELS, type CalItem } from '@/lib/calendar'

interface Props {
  gridDates: Date[]      // 42 dates (6 weeks)
  monthIndex: number     // 0-11, days outside are dimmed
  items: CalItem[]
  conflicts: Set<string>
  onSlotClick: (date: Date) => void
  onItemClick: (item: CalItem) => void
}

function itemsForDate(items: CalItem[], dateKey: string) {
  return items.filter(it =>
    it.band ? it.startDate <= dateKey && it.endDate >= dateKey : it.startDate === dateKey,
  )
}

export default function CalendarMonthGrid({ gridDates, monthIndex, items, conflicts, onSlotClick, onItemClick }: Props) {
  const todayIso = iso(new Date())

  return (
    <div className="rounded-xl border border-gray-150 overflow-hidden bg-white">
      <div className="grid grid-cols-7 border-b border-gray-150">
        {DAY_LABELS.map(label => (
          <div key={label} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDates.map((date, i) => {
          const key = iso(date)
          const inMonth = date.getMonth() === monthIndex
          const isToday = key === todayIso
          const dayItems = itemsForDate(items, key)
          const shown = dayItems.slice(0, 3)
          const extra = dayItems.length - shown.length
          return (
            <div
              key={i}
              className={`min-h-[112px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 ${
                inMonth ? 'bg-white' : 'bg-gray-50/60'
              }`}
            >
              <button
                onClick={() => onSlotClick(date)}
                className="self-start text-left"
                aria-label="Add on this day"
              >
                <span className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full ${
                  isToday ? 'bg-studio-600 text-white' : inMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </span>
              </button>

              <div className="flex flex-col gap-0.5">
                {shown.map(item => (
                  <button
                    key={item.key}
                    onClick={() => onItemClick(item)}
                    title={item.title}
                    className="flex items-center gap-1 text-left rounded px-1 py-0.5 text-[11px] font-medium text-white truncate"
                    style={{
                      background: item.color,
                      outline: conflicts.has(item.key) ? '2px solid #ef4444' : undefined,
                    }}
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
                {extra > 0 && (
                  <button
                    onClick={() => onSlotClick(date)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 text-left px-1"
                  >
                    +{extra} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
