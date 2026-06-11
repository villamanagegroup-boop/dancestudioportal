// Shared taxonomy + presentation helpers for the site-intake triage inbox.
// Pure data/format helpers (no React, no client deps) so both the server page
// and the client components can import them.

export type IntakeStatus = 'new' | 'matched' | 'dismissed' | 'duplicate' | 'invited'

export const INTAKE_STATUSES: IntakeStatus[] = ['new', 'matched', 'dismissed', 'duplicate', 'invited']

// Source-form slugs, matching FORM_TYPE_BY_TABLE in
// src/app/api/intake/from-site/route.ts. `spirit_week` was retired from the
// public site 2026-06-01 so it's intentionally omitted here; any older rows
// carrying that slug still render via formLabel()'s fallback.
export const FORM_TYPES: { slug: string; label: string }[] = [
  { slug: 'contact',       label: 'Contact' },
  { slug: 'birthday',      label: 'Birthday' },
  { slug: 'camp',          label: 'Camp' },
  { slug: 'summer_class',  label: 'Summer Class' },
  { slug: 'recital_order', label: 'Recital Order' },
  { slug: 'recital_shirt', label: 'Recital Shirt' },
  { slug: 'adult_series',  label: 'Adult Series' },
]

const FORM_LABEL = new Map(FORM_TYPES.map(f => [f.slug, f.label]))

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function formLabel(slug: string): string {
  return FORM_LABEL.get(slug) ?? titleCase(slug)
}

export function humanizeKey(key: string): string {
  return titleCase(key)
}

type Payload = Record<string, unknown>

// Identity/meta fields that are surfaced elsewhere (name/email columns) or are
// plumbing — excluded from the summary and the labeled detail rows.
const META_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'email', 'parent_email',
  'first_name', 'last_name', 'parent_name', 'contact_name', 'name', 'phone',
])

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function firstOf(p: Payload, keys: string[]): string {
  for (const k of keys) {
    const v = str(p[k]).trim()
    if (v) return v
  }
  return ''
}

// A short human one-liner describing the submission, for the list view.
// Defensive about column names: the payload is the verbatim row from the
// public site's tables, so we probe a prioritized list of likely keys per
// form and fall back to the first meaningful field.
export function summarize(sourceForm: string, payload: Payload | null | undefined): string {
  const p = payload ?? {}
  let s = ''
  switch (sourceForm) {
    case 'contact':
      s = firstOf(p, ['message', 'inquiry', 'notes', 'comments'])
      break
    case 'birthday': {
      const theme = firstOf(p, ['theme', 'party_theme'])
      const date = firstOf(p, ['party_date', 'event_date', 'preferred_date', 'date'])
      s = [theme, date].filter(Boolean).join(' • ')
      break
    }
    case 'camp': {
      const camper = firstOf(p, ['camper_name', 'child_name', 'student_name'])
      const weeks = firstOf(p, ['camp_weeks', 'weeks', 'week', 'session'])
      s = [camper, weeks].filter(Boolean).join(' • ')
      break
    }
    case 'summer_class': {
      const student = firstOf(p, ['student_name', 'child_name', 'dancer_name'])
      const cls = firstOf(p, ['class_name', 'class', 'classes', 'program'])
      s = [student, cls].filter(Boolean).join(' • ')
      break
    }
    case 'recital_order':
    case 'recital_shirt':
      s = firstOf(p, ['items', 'order_summary', 'sizes', 'quantity', 'notes'])
      break
    case 'adult_series':
      s = firstOf(p, ['interest', 'message', 'series', 'notes', 'comments'])
      break
  }
  if (!s) {
    for (const [k, v] of Object.entries(p)) {
      if (META_KEYS.has(k)) continue
      const val = str(v).trim()
      if (val) { s = `${humanizeKey(k)}: ${val}`; break }
    }
  }
  return s
}

// Meaningful payload fields as labeled rows for the detail drawer. Skips meta
// keys and empty values; objects/arrays are JSON-stringified compactly.
export function detailRows(payload: Payload | null | undefined): { label: string; value: string }[] {
  const p = payload ?? {}
  const rows: { label: string; value: string }[] = []
  for (const [k, v] of Object.entries(p)) {
    if (META_KEYS.has(k)) continue
    if (v == null || v === '') continue
    let value: string
    if (typeof v === 'object') {
      try { value = JSON.stringify(v) } catch { continue }
      if (value === '{}' || value === '[]') continue
    } else {
      value = str(v).trim()
    }
    if (!value) continue
    rows.push({ label: humanizeKey(k), value })
  }
  return rows
}

export function truncate(s: string, n = 80): string {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + '…'
}

// --- Phase 3: convert a submission into a new family + portal invite ---

export interface DetectedDancer {
  first_name: string
  last_name: string
  // ISO date 'YYYY-MM-DD' when the form supplied one; the accept flow only
  // materializes a student record when a DOB is present.
  date_of_birth: string | null
}

// Split a free-text submitter name into first/last. Last whitespace-delimited
// token becomes the last name; everything before it is the first name. A
// single token is treated as the first name only.
export function parseSubmitterName(name: string | null | undefined): { first_name: string; last_name: string } {
  const tokens = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { first_name: '', last_name: '' }
  if (tokens.length === 1) return { first_name: tokens[0], last_name: '' }
  return { first_name: tokens.slice(0, -1).join(' '), last_name: tokens[tokens.length - 1] }
}

// Best-effort extraction of a dancer from a form payload. Probes the likely
// name keys across the various site forms; returns null when no name is found.
// DOB is optional — included only when the form carried one in a parseable form.
export function detectDancer(
  payload: Payload | null | undefined,
  fallbackLastName = '',
): DetectedDancer | null {
  const p = payload ?? {}
  const raw = firstOf(p, [
    'camper_name', 'child_name', 'student_name', 'dancer_name', 'participant_name',
  ])
  if (!raw) return null
  const { first_name, last_name } = parseSubmitterName(raw)
  const dobRaw = firstOf(p, ['date_of_birth', 'dob', 'birthdate', 'birth_date'])
  let date_of_birth: string | null = null
  if (dobRaw) {
    const d = new Date(dobRaw)
    if (!isNaN(d.getTime())) date_of_birth = d.toISOString().slice(0, 10)
  }
  return { first_name, last_name: last_name || fallbackLastName, date_of_birth }
}

export function detectPhone(payload: Payload | null | undefined): string | null {
  const v = firstOf(payload ?? {}, ['phone', 'phone_number', 'mobile', 'cell', 'contact_phone'])
  return v || null
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString()
}
