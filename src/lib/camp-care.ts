// Before/after care pricing + parsing.
//
// The numbers here MIRROR the public camp-registration form
// (capitalcoredancewebsite · src/pages/CampForm.jsx). Keep them in sync:
//   CARE_RATE, BEFORE_CARE_END, AFTER_CARE_START.
// Care is billed by the hour: how long before 9:15 AM a dancer is dropped off
// (before care), or how long after 3:45 PM they're picked up (after care).

export const CARE_RATE = 15 // $/hour, studio-wide, every camp
export const BEFORE_CARE_END = '9:15' // before care runs until camp start
export const AFTER_CARE_START = '3:45' // after care runs from camp end
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Selectable drop-off / pickup times — mirror the public form.
export const BEFORE_CARE_TIMES = ['8:00', '8:15', '8:30', '8:45', '9:00', '9:15']
export const AFTER_CARE_TIMES = ['3:45', '4:00', '4:15', '4:30', '4:45', '5:00']

export type CareKind = 'before' | 'after'

export function timeStrToMinutes(t: string): number {
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function beforeCareHours(dropOff: string): number {
  return Math.max(0, (timeStrToMinutes(BEFORE_CARE_END) - timeStrToMinutes(dropOff)) / 60)
}

export function afterCareHours(pickup: string): number {
  return Math.max(0, (timeStrToMinutes(pickup) - timeStrToMinutes(AFTER_CARE_START)) / 60)
}

export function careHours(kind: CareKind, time: string): number {
  return kind === 'before' ? beforeCareHours(time) : afterCareHours(time)
}

// hours * rate * days, rounded to cents.
export function careAmount(hours: number, days: number, rate = CARE_RATE): number {
  return Math.round(hours * rate * days * 100) / 100
}

export function careLabel(kind: CareKind, time: string | null): string {
  if (kind === 'before') return time ? `Before care · drop-off ${time}` : 'Before care'
  return time ? `After care · pickup ${time}` : 'After care'
}

// Which weekdays a week selection actually attends — mirrors attendedDays() on
// the public form. full/half week = all five; single-day = the chosen days.
function attendedDays(selection: { type?: string; days?: string[] } | null | undefined): string[] {
  if (!selection || !selection.type) return []
  if (selection.type === 'full_week' || selection.type === 'half_week') return WEEKDAYS
  return selection.days || []
}

// One parsed care line, ready to become a camp_care row. weekKey/weekLabel let
// the caller match it to the right per-week camp_registration.
export interface ParsedCareLine {
  kind: CareKind
  time: string | null
  hours: number
  days: number
  amount: number
  weekKey: string | null
  weekLabel: string | null
}

// Pull structured care out of one camper object from a website camp_registration
// payload (site_intake.payload.campers[i]). The form aggregates careItems across
// all of a camper's weeks, so we re-expand here: for each selected week we count
// how many of the chosen care weekdays it attends, and emit one line per
// (week, kind). That keeps care attributable to the right per-week registration.
export function parseCamperCare(camper: Record<string, unknown>): ParsedCareLine[] {
  const lines: ParsedCareLine[] = []
  const weeks = (camper.weeks ?? {}) as Record<string, { type?: string; days?: string[] }>
  const weekItems = (camper.weekItems ?? []) as Array<{ weekKey?: string; weekLabel?: string }>
  const labelFor = (key: string) =>
    weekItems.find(w => w.weekKey === key)?.weekLabel ?? null

  for (const kind of ['before', 'after'] as CareKind[]) {
    const care = (camper[kind === 'before' ? 'beforeCare' : 'afterCare'] ?? null) as
      | { enabled?: boolean; time?: string; days?: string[] }
      | null
    if (!care || !care.enabled || !care.time) continue
    const chosen = new Set(care.days || [])
    if (chosen.size === 0) continue
    const hours = careHours(kind, care.time)
    if (hours <= 0) continue

    for (const [weekKey, sel] of Object.entries(weeks)) {
      const dayCount = attendedDays(sel).filter(d => chosen.has(d)).length
      if (dayCount <= 0) continue
      lines.push({
        kind,
        time: care.time,
        hours,
        days: dayCount,
        amount: careAmount(hours, dayCount),
        weekKey,
        weekLabel: labelFor(weekKey),
      })
    }
  }
  return lines
}
