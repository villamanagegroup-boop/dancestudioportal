'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import {
  iso, parseISO, addDays, dowKey, parseHour, floatToTime,
  EVENT_COLORS, KIND_COLORS, KIND_LABELS,
  type CalItem, type CalKind,
} from '@/lib/calendar'
import CalendarTimeGrid from '@/components/admin/CalendarTimeGrid'
import CalendarMonthGrid from '@/components/admin/CalendarMonthGrid'
import CalendarCreateModal, { type SlotContext } from '@/components/forms/CalendarCreateModal'
import CalendarEventModal from '@/components/forms/CalendarEventModal'

type View = 'day' | 'week' | 'month'

interface StudioHour {
  day_of_week: string; is_open: boolean; open_time: string; close_time: string
}

interface Props {
  view: View
  anchor: string       // YYYY-MM-DD
  gridStart: string    // YYYY-MM-DD — first day of the grid
  classes: any[]
  events: any[]
  camps: any[]
  parties: any[]
  bookings: any[]
  studioHours: StudioHour[]
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: { id: string; name: string }[]
}

const ALL_KINDS: CalKind[] = ['class', 'event', 'camp', 'party', 'booking']

export default function CalendarView(props: Props) {
  const { view, anchor, gridStart, classes, events, camps, parties, bookings, studioHours } = props
  const router = useRouter()

  const [createCtx, setCreateCtx] = useState<SlotContext | null>(null)
  const [editEvent, setEditEvent] = useState<any | null>(null)
  const [kinds, setKinds] = useState<Set<CalKind>>(new Set(ALL_KINDS))
  const [roomFilter, setRoomFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState('')

  const anchorDate = parseISO(anchor)
  const gridStartDate = parseISO(gridStart)

  const gridDates = useMemo(() => {
    const count = view === 'day' ? 1 : view === 'week' ? 7 : 42
    return Array.from({ length: count }, (_, i) => addDays(gridStartDate, i))
  }, [view, gridStart])

  const gridKeys = useMemo(() => new Set(gridDates.map(iso)), [gridDates])
  const gridStartKey = iso(gridDates[0])
  const gridEndKey = iso(gridDates[gridDates.length - 1])

  // ---- normalize every source into CalItem[] -------------------------
  const allItems = useMemo<CalItem[]>(() => {
    const out: CalItem[] = []

    // Classes — recurring weekly by day_of_week
    for (const c of classes) {
      const sh = parseHour(c.start_time)
      const eh = parseHour(c.end_time)
      for (const d of gridDates) {
        if (dowKey(d) !== c.day_of_week) continue
        const key = iso(d)
        out.push({
          key: `class-${c.id}-${key}`,
          sourceId: c.id,
          kind: 'class',
          title: c.name,
          subtitle: c.instructor ? `${c.instructor.first_name} ${c.instructor.last_name}` : undefined,
          color: c.class_type?.color ?? KIND_COLORS.class,
          href: `/classes/${c.id}`,
          editable: false,
          draggable: true,
          band: false,
          startDate: key,
          endDate: key,
          startHour: sh ?? 9,
          endHour: eh ?? (sh ?? 9) + 1,
          roomId: c.room_id ?? null,
          roomName: c.room?.name ?? null,
          instructorId: c.instructor_id ?? null,
          raw: c,
        })
      }
    }

    // Calendar events
    for (const ev of events) {
      const sh = parseHour(ev.start_time)
      const eh = parseHour(ev.end_time)
      const color = EVENT_COLORS[ev.event_type] ?? KIND_COLORS.event
      const isMulti = ev.all_day || (ev.end_date && ev.end_date !== ev.start_date)

      if (ev.recurrence === 'weekly') {
        const baseDow = dowKey(parseISO(ev.start_date))
        for (const d of gridDates) {
          if (dowKey(d) !== baseDow) continue
          const key = iso(d)
          if (key < ev.start_date) continue
          if (ev.recurrence_end && key > ev.recurrence_end) continue
          out.push({
            key: `event-${ev.id}-${key}`,
            sourceId: ev.id,
            kind: 'event',
            title: ev.title,
            subtitle: ev.event_type,
            color,
            editable: true,
            draggable: false,
            band: !!ev.all_day,
            startDate: key,
            endDate: key,
            startHour: ev.all_day ? undefined : sh ?? undefined,
            endHour: ev.all_day ? undefined : eh ?? undefined,
            roomId: ev.room_id ?? null,
            roomName: ev.room?.name ?? null,
            raw: ev,
          })
        }
      } else {
        const endKey = ev.end_date || ev.start_date
        if (ev.start_date > gridEndKey || endKey < gridStartKey) continue
        out.push({
          key: `event-${ev.id}`,
          sourceId: ev.id,
          kind: 'event',
          title: ev.title,
          subtitle: ev.event_type,
          color,
          editable: true,
          draggable: !isMulti,
          band: !!isMulti,
          startDate: ev.start_date,
          endDate: endKey,
          startHour: isMulti ? undefined : sh ?? undefined,
          endHour: isMulti ? undefined : eh ?? undefined,
          roomId: ev.room_id ?? null,
          roomName: ev.room?.name ?? null,
          raw: ev,
        })
      }
    }

    // Camps — multi-day band (or timed if single day)
    for (const cp of camps) {
      const isMulti = cp.end_date && cp.end_date !== cp.start_date
      const sh = parseHour(cp.start_time)
      const eh = parseHour(cp.end_time)
      out.push({
        key: `camp-${cp.id}`,
        sourceId: cp.id,
        kind: 'camp',
        title: cp.name,
        subtitle: 'Camp',
        color: KIND_COLORS.camp,
        href: '/camps',
        editable: false,
        draggable: false,
        band: !!isMulti,
        startDate: cp.start_date,
        endDate: cp.end_date || cp.start_date,
        startHour: isMulti ? undefined : sh ?? 9,
        endHour: isMulti ? undefined : eh ?? (sh ?? 9) + 1,
        roomId: cp.room_id ?? null,
        roomName: cp.room?.name ?? null,
        raw: cp,
      })
    }

    // Parties
    for (const p of parties) {
      const sh = parseHour(p.start_time)
      const eh = parseHour(p.end_time)
      out.push({
        key: `party-${p.id}`,
        sourceId: p.id,
        kind: 'party',
        title: p.contact_name ? `${p.contact_name} — Party` : 'Party',
        subtitle: p.status,
        color: KIND_COLORS.party,
        href: '/parties',
        editable: false,
        draggable: true,
        band: false,
        startDate: p.event_date,
        endDate: p.event_date,
        startHour: sh ?? 9,
        endHour: eh ?? (sh ?? 9) + 1,
        roomId: p.room_id ?? null,
        roomName: p.room?.name ?? null,
        raw: p,
      })
    }

    // Bookings
    for (const b of bookings) {
      const sh = parseHour(b.start_time)
      const eh = parseHour(b.end_time)
      out.push({
        key: `booking-${b.id}`,
        sourceId: b.id,
        kind: 'booking',
        title: b.title,
        subtitle: b.booking_type,
        color: KIND_COLORS.booking,
        href: '/bookings',
        editable: false,
        draggable: true,
        band: false,
        startDate: b.booking_date,
        endDate: b.booking_date,
        startHour: sh ?? 9,
        endHour: eh ?? (sh ?? 9) + 1,
        roomId: b.room_id ?? null,
        roomName: b.room?.name ?? null,
        raw: b,
      })
    }

    return out
  }, [classes, events, camps, parties, bookings, gridDates, gridStartKey, gridEndKey])

  // ---- filters -------------------------------------------------------
  const filtered = useMemo(() => allItems.filter(it => {
    if (!kinds.has(it.kind)) return false
    if (roomFilter && it.roomId !== roomFilter) return false
    if (instructorFilter && it.instructorId !== instructorFilter) return false
    return true
  }), [allItems, kinds, roomFilter, instructorFilter])

  // ---- conflict detection (same room, overlapping time, same day) ----
  const conflicts = useMemo(() => {
    const set = new Set<string>()
    const groups = new Map<string, CalItem[]>()
    for (const it of filtered) {
      if (it.band || !it.roomId || it.startHour == null || it.endHour == null) continue
      const gk = `${it.startDate}|${it.roomId}`
      const arr = groups.get(gk) ?? []
      arr.push(it)
      groups.set(gk, arr)
    }
    for (const arr of groups.values()) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j]
          if (a.startHour! < b.endHour! && b.startHour! < a.endHour!) {
            set.add(a.key)
            set.add(b.key)
          }
        }
      }
    }
    return set
  }, [filtered])

  const bandItems = filtered.filter(i => i.band)
  const timedItems = filtered.filter(i => !i.band)

  // ---- navigation ----------------------------------------------------
  function go(view2: View, date?: string) {
    const params = new URLSearchParams()
    params.set('view', view2)
    if (date) params.set('date', date)
    router.push(`/calendar?${params.toString()}`)
  }
  function shift(delta: number) {
    if (view === 'month') {
      const d = parseISO(anchor)
      d.setMonth(d.getMonth() + delta)
      go('month', iso(d))
    } else {
      const step = view === 'day' ? 1 : 7
      go(view, iso(addDays(anchorDate, delta * step)))
    }
  }

  const label = view === 'day'
    ? anchorDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : view === 'month'
      ? anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${gridDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${gridDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // ---- interactions --------------------------------------------------
  function openCreate(date: Date, hour = 9) {
    setCreateCtx({ date: iso(date), dayOfWeek: dowKey(date), time: `${String(hour).padStart(2, '0')}:00` })
  }
  function onItemClick(item: CalItem) {
    if (item.editable) setEditEvent(item.raw)
    else if (item.href) router.push(item.href)
  }
  async function onItemDrop(item: CalItem, date: Date, hour: number) {
    if (!item.draggable || item.startHour == null) return
    const dur = (item.endHour ?? item.startHour + 1) - item.startHour
    const start = floatToTime(hour)
    const end = floatToTime(hour + dur)
    const endpoints: Record<string, { url: string; body: any }> = {
      class: { url: `/api/classes/${item.sourceId}`, body: { day_of_week: dowKey(date), start_time: start, end_time: end } },
      event: { url: `/api/calendar-events/${item.sourceId}`, body: { start_date: iso(date), start_time: start, end_time: end } },
      party: { url: `/api/parties/${item.sourceId}`, body: { event_date: iso(date), start_time: start, end_time: end } },
      booking: { url: `/api/bookings/${item.sourceId}`, body: { booking_date: iso(date), start_time: start, end_time: end } },
    }
    const target = endpoints[item.kind]
    if (!target) return
    const res = await fetch(target.url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target.body),
    })
    if (res.ok) router.refresh()
    else {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? 'Failed to reschedule')
    }
  }

  function toggleKind(k: CalKind) {
    setKinds(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="eyebrow">{view === 'month' ? 'Month' : view === 'day' ? 'Day' : 'Week'}</div>
          <h1 className="h1">{label}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {conflicts.size > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
              <AlertTriangle size={13} /> {conflicts.size / 2} room conflict{conflicts.size > 2 ? 's' : ''}
            </span>
          )}
          <div className="role-switch">
            {(['day', 'week', 'month'] as View[]).map(v => (
              <button key={v} aria-pressed={view === v} onClick={() => go(v, anchor)} className="capitalize">{v}</button>
            ))}
          </div>
          <button onClick={() => shift(-1)} className="btn btn-ghost btn-sm" aria-label="Previous"><ChevronLeft size={14} /></button>
          <button onClick={() => go(view)} className="btn btn-ghost btn-sm">Today</button>
          <button onClick={() => shift(1)} className="btn btn-ghost btn-sm" aria-label="Next"><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_KINDS.map(k => (
          <button
            key={k}
            onClick={() => toggleKind(k)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
            style={{
              borderColor: kinds.has(k) ? KIND_COLORS[k] : '#e5e7eb',
              background: kinds.has(k) ? KIND_COLORS[k] + '15' : 'white',
              color: kinds.has(k) ? '#374151' : '#9ca3af',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLORS[k] }} />
            {KIND_LABELS[k]}
          </button>
        ))}
        <select
          value={roomFilter}
          onChange={e => setRoomFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-studio-500"
        >
          <option value="">All rooms</option>
          {props.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          value={instructorFilter}
          onChange={e => setInstructorFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-studio-500"
        >
          <option value="">All instructors</option>
          {props.instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="glass card" style={{ padding: 18, overflow: 'auto' }}>
        {view === 'month' ? (
          <CalendarMonthGrid
            gridDates={gridDates}
            monthIndex={anchorDate.getMonth()}
            items={filtered}
            conflicts={conflicts}
            onSlotClick={d => openCreate(d)}
            onItemClick={onItemClick}
          />
        ) : (
          <CalendarTimeGrid
            dates={gridDates}
            bandItems={bandItems}
            timedItems={timedItems}
            studioHours={studioHours}
            conflicts={conflicts}
            onSlotClick={openCreate}
            onItemClick={onItemClick}
            onItemDrop={onItemDrop}
          />
        )}
        <p className="text-xs text-gray-400 mt-3">
          Click an empty slot to add something. Drag a timed item to reschedule it.
          {view !== 'month' && ' Hatched columns are days the studio is closed.'}
        </p>
      </div>

      {createCtx && (
        <CalendarCreateModal
          onClose={() => setCreateCtx(null)}
          context={createCtx}
          instructors={props.instructors}
          rooms={props.rooms}
          classTypes={props.classTypes}
          seasons={props.seasons}
        />
      )}
      {editEvent && (
        <CalendarEventModal
          onClose={() => setEditEvent(null)}
          rooms={props.rooms}
          event={editEvent}
        />
      )}
    </div>
  )
}
