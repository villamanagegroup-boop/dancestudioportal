'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import ClassEnrollCard from '@/components/portal/ClassEnrollCard'

export interface BrowseClass {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  monthly_tuition: number | null
  color: string
  style: string | null
  instructorName: string | null
  spotsLeft: number | null
}

interface Student { id: string; first_name: string; last_name: string }

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const selectCls = 'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

export default function PortalClassBrowser({ classes, students }: { classes: BrowseClass[]; students: Student[] }) {
  const [q, setQ] = useState('')
  const [day, setDay] = useState('')
  const [style, setStyle] = useState('')
  const [openOnly, setOpenOnly] = useState(false)

  const days = useMemo(
    () => DAY_ORDER.filter(d => classes.some(c => c.day_of_week === d)),
    [classes],
  )
  const styles = useMemo(
    () => Array.from(new Set(classes.map(c => c.style).filter(Boolean) as string[])).sort(),
    [classes],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return classes.filter(c => {
      if (needle && !(`${c.name} ${c.instructorName ?? ''}`.toLowerCase().includes(needle))) return false
      if (day && c.day_of_week !== day) return false
      if (style && c.style !== style) return false
      if (openOnly && c.spotsLeft != null && c.spotsLeft <= 0) return false
      return true
    })
  }, [classes, q, day, style, openOnly])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search classes…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
          />
        </div>
        <select value={day} onChange={e => setDay(e.target.value)} className={selectCls}>
          <option value="">Any day</option>
          {days.map(d => <option key={d} value={d} className="capitalize">{d[0].toUpperCase() + d.slice(1)}</option>)}
        </select>
        {styles.length > 0 && (
          <select value={style} onChange={e => setStyle(e.target.value)} className={selectCls}>
            <option value="">All styles</option>
            {styles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} className="rounded text-studio-600" />
          Open spots
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No classes match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(cls => (
            <ClassEnrollCard
              key={cls.id}
              cls={{
                id: cls.id,
                name: cls.name,
                day_of_week: cls.day_of_week,
                start_time: cls.start_time,
                end_time: cls.end_time,
                monthly_tuition: cls.monthly_tuition,
                color: cls.color,
                instructorName: cls.instructorName,
                spotsLeft: cls.spotsLeft,
              }}
              students={students}
            />
          ))}
        </div>
      )}
    </div>
  )
}
