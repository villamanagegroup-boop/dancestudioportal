// Shared calendar helpers + the normalized calendar-item model.

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type CalKind = 'class' | 'event' | 'camp' | 'party' | 'booking'

export interface CalItem {
  key: string            // unique React key (recurring instances differ by date)
  sourceId: string       // DB row id — used for PATCH / navigation
  kind: CalKind
  title: string
  subtitle?: string
  color: string
  href?: string          // navigate on click
  editable: boolean      // calendar_events open the edit modal
  draggable: boolean     // timed, single-day, non-recurring, non-camp
  band: boolean          // render in the all-day / multi-day band
  startDate: string      // YYYY-MM-DD (band: span start; timed: the day)
  endDate: string        // YYYY-MM-DD (band: span end; timed: == startDate)
  startHour?: number     // timed only
  endHour?: number
  roomId?: string | null
  roomName?: string | null
  instructorId?: string | null
  raw: any
}

export const EVENT_COLORS: Record<string, string> = {
  blackout: '#ef4444',
  meeting: '#3b82f6',
  placeholder: '#94a3b8',
  event: '#8b5cf6',
}

export const KIND_COLORS: Record<CalKind, string> = {
  class: '#7c3aed',
  event: '#8b5cf6',
  camp: '#f59e0b',
  party: '#ec4899',
  booking: '#0ea5e9',
}

export const KIND_LABELS: Record<CalKind, string> = {
  class: 'Classes',
  event: 'Events',
  camp: 'Camps',
  party: 'Parties',
  booking: 'Bookings',
}

export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseISO(s: string) {
  return new Date(s + 'T00:00:00')
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Monday-indexed day-of-week key for a Date
export function dowKey(d: Date) {
  return DAYS[(d.getDay() + 6) % 7]
}

export function parseHour(t: string | null | undefined): number | null {
  if (!t) return null
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh)) return null
  return hh + (mm || 0) / 60
}

export function floatToTime(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
