'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, Table2, ClipboardList, HeartPulse, CalendarCheck, ListChecks, SlidersHorizontal } from 'lucide-react'
import {
  type ExportColumn, type ExportRow,
  downloadCSV, printReport, exportToGoogleSheets, formatCellValue,
} from '@/lib/export'

// Raw, server-fetched camp registration with student + guardian + medical info.
export interface CampExportRecord {
  id: string
  status: string
  payment_status: string
  student: {
    id: string
    first_name: string | null
    last_name: string | null
    date_of_birth: string | null
    allergies: string | null
    medications: string | null
    medical_conditions: string | null
    medical_notes: string | null
    doctor_name: string | null
    doctor_phone: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    guardian_students: Array<{
      is_primary: boolean
      relationship: string | null
      guardian: {
        first_name: string | null
        last_name: string | null
        phone: string | null
        email: string | null
        address_street: string | null
        address_city: string | null
        address_state: string | null
        address_zip: string | null
      } | null
    }> | null
  } | null
}

export interface CampAttendanceRec {
  student_id: string
  attend_date: string
  present: boolean
}

interface CampInfo {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface Props {
  camp: CampInfo
  records: CampExportRecord[]
  attendance: CampAttendanceRec[]
}

type DatasetKey = 'info' | 'medical' | 'contacts' | 'signinout' | 'attendance' | 'custom'

// Every column the custom builder can pick from. Keys match the flattened
// `base` row below. Grouped for the picker UI; order here = column order.
type FieldGroup = 'Camper' | 'Parent & Contact' | 'Medical'
const FIELD_DEFS: { key: string; label: string; group: FieldGroup; format?: ExportColumn['format'] }[] = [
  { key: 'camper', label: 'Camper', group: 'Camper' },
  { key: 'dob', label: 'Date of Birth', group: 'Camper', format: 'date' },
  { key: 'status', label: 'Status', group: 'Camper' },
  { key: 'payment_status', label: 'Payment', group: 'Camper' },
  { key: 'parent', label: 'Parent/Guardian', group: 'Parent & Contact' },
  { key: 'parentPhone', label: 'Phone', group: 'Parent & Contact' },
  { key: 'parentEmail', label: 'Email', group: 'Parent & Contact' },
  { key: 'parentAddress', label: 'Address', group: 'Parent & Contact' },
  { key: 'emergencyName', label: 'Emergency Contact', group: 'Parent & Contact' },
  { key: 'emergencyPhone', label: 'Emergency Phone', group: 'Parent & Contact' },
  { key: 'allergies', label: 'Allergies', group: 'Medical' },
  { key: 'medications', label: 'Medications', group: 'Medical' },
  { key: 'medical_conditions', label: 'Medical Conditions', group: 'Medical' },
  { key: 'medical_notes', label: 'Medical Notes', group: 'Medical' },
  { key: 'doctor', label: 'Doctor', group: 'Medical' },
  { key: 'doctorPhone', label: 'Doctor Phone', group: 'Medical' },
]
const FIELD_GROUPS: FieldGroup[] = ['Camper', 'Parent & Contact', 'Medical']
const DEFAULT_FIELDS = ['camper', 'dob', 'parent', 'parentPhone', 'parentEmail', 'allergies', 'medications', 'medical_conditions']
const STORE_KEY = 'camp-export-custom-v1'

const fullName = (f?: string | null, l?: string | null) => `${f ?? ''} ${l ?? ''}`.trim()

// Persisted custom-export selection. SSR-safe; defaults when absent/malformed.
function loadCustom(): { fields: string[]; attendance: boolean; signinout: boolean } {
  const fallback = { fields: DEFAULT_FIELDS, attendance: false, signinout: false }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return fallback
    const s = JSON.parse(raw)
    return {
      fields: Array.isArray(s.fields) ? s.fields : DEFAULT_FIELDS,
      attendance: !!s.attendance,
      signinout: !!s.signinout,
    }
  } catch {
    return fallback
  }
}

// Each camp day (inclusive) between start and end, as YYYY-MM-DD + a short label.
function campDays(start: string, end: string): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = []
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    out.push({ date: iso, label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }) })
  }
  return out
}

export default function CampExportPanel({ camp, records, attendance }: Props) {
  const [dataset, setDataset] = useState<DatasetKey>('info')
  const [notice, setNotice] = useState('')

  // Custom builder selection — lazy-loaded from localStorage (SSR-safe), and the
  // picker only renders once the user opens the Custom tab, so no hydration gap.
  const [customFields, setCustomFields] = useState<string[]>(() => loadCustom().fields)
  const [customAttendance, setCustomAttendance] = useState(() => loadCustom().attendance)
  const [customSignInOut, setCustomSignInOut] = useState(() => loadCustom().signinout)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ fields: customFields, attendance: customAttendance, signinout: customSignInOut }))
    } catch { /* ignore */ }
  }, [customFields, customAttendance, customSignInOut])

  const toggleField = (key: string) =>
    setCustomFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const days = useMemo(() => campDays(camp.start_date, camp.end_date), [camp.start_date, camp.end_date])

  // Flatten each registration into a base row (primary guardian + medical).
  const base = useMemo(() => records.map(r => {
    const s = r.student
    const links = s?.guardian_students ?? []
    const primary = (links.find(g => g.is_primary) || links[0])?.guardian ?? null
    const addr = primary
      ? [primary.address_street, [primary.address_city, primary.address_state].filter(Boolean).join(', '), primary.address_zip].filter(Boolean).join(' · ')
      : ''
    return {
      student_id: s?.id ?? '',
      camper: fullName(s?.first_name, s?.last_name) || '—',
      dob: s?.date_of_birth ?? '',
      status: r.status,
      payment_status: r.payment_status,
      parent: primary ? fullName(primary.first_name, primary.last_name) : '',
      parentPhone: primary?.phone ?? '',
      parentEmail: primary?.email ?? '',
      parentAddress: addr,
      emergencyName: s?.emergency_contact_name ?? '',
      emergencyPhone: s?.emergency_contact_phone ?? '',
      allergies: s?.allergies ?? '',
      medications: s?.medications ?? '',
      medical_conditions: s?.medical_conditions ?? '',
      medical_notes: s?.medical_notes ?? '',
      doctor: s?.doctor_name ?? '',
      doctorPhone: s?.doctor_phone ?? '',
    }
  }).sort((a, b) => a.camper.localeCompare(b.camper)), [records])

  // Build the selected dataset's columns + rows.
  const { columns, rows, title } = useMemo<{ columns: ExportColumn[]; rows: ExportRow[]; title: string }>(() => {
    if (dataset === 'info') {
      return {
        title: 'Camper Information',
        columns: [
          { key: 'camper', label: 'Camper' },
          { key: 'dob', label: 'Date of Birth', format: 'date' },
          { key: 'status', label: 'Status' },
          { key: 'payment_status', label: 'Payment' },
          { key: 'parent', label: 'Parent/Guardian' },
          { key: 'parentPhone', label: 'Phone' },
          { key: 'parentEmail', label: 'Email' },
          { key: 'allergies', label: 'Allergies' },
          { key: 'medications', label: 'Medications' },
          { key: 'medical_conditions', label: 'Medical Conditions' },
        ],
        rows: base,
      }
    }
    if (dataset === 'medical') {
      return {
        title: 'Allergy & Medical Sheet',
        columns: [
          { key: 'camper', label: 'Camper' },
          { key: 'allergies', label: 'Allergies' },
          { key: 'medications', label: 'Medications' },
          { key: 'medical_conditions', label: 'Medical Conditions' },
          { key: 'medical_notes', label: 'Medical Notes' },
          { key: 'doctor', label: 'Doctor' },
          { key: 'doctorPhone', label: 'Doctor Phone' },
          { key: 'emergencyName', label: 'Emergency Contact' },
          { key: 'emergencyPhone', label: 'Emergency Phone' },
        ],
        rows: base,
      }
    }
    if (dataset === 'contacts') {
      return {
        title: 'Parent Contact List',
        columns: [
          { key: 'camper', label: 'Camper' },
          { key: 'parent', label: 'Parent/Guardian' },
          { key: 'parentPhone', label: 'Phone' },
          { key: 'parentEmail', label: 'Email' },
          { key: 'parentAddress', label: 'Address' },
          { key: 'emergencyName', label: 'Emergency Contact' },
          { key: 'emergencyPhone', label: 'Emergency Phone' },
        ],
        rows: base,
      }
    }
    if (dataset === 'signinout') {
      // Blank per-day sign-in / sign-out grid for staff to fill in on paper.
      const cols: ExportColumn[] = [
        { key: 'camper', label: 'Camper' },
        { key: 'parentPhone', label: 'Phone' },
      ]
      for (const d of days) {
        cols.push({ key: `in_${d.date}`, label: `${d.label} In`, align: 'center' })
        cols.push({ key: `out_${d.date}`, label: `${d.label} Out`, align: 'center' })
      }
      const r = base.map(b => ({ camper: b.camper, parentPhone: b.parentPhone }))
      return { title: 'Sign-In / Sign-Out Sheet', columns: cols, rows: r }
    }
    if (dataset === 'custom') {
      const cols: ExportColumn[] = FIELD_DEFS
        .filter(f => customFields.includes(f.key))
        .map(f => ({ key: f.key, label: f.label, format: f.format }))
      const att = new Map(attendance.map(a => [`${a.student_id}|${a.attend_date}`, a.present]))
      if (customAttendance) for (const d of days) cols.push({ key: `att_${d.date}`, label: d.label, align: 'center' })
      if (customSignInOut) for (const d of days) {
        cols.push({ key: `in_${d.date}`, label: `${d.label} In`, align: 'center' })
        cols.push({ key: `out_${d.date}`, label: `${d.label} Out`, align: 'center' })
      }
      const r = base.map(b => {
        const rec = b as Record<string, unknown>
        const row: ExportRow = {}
        for (const f of FIELD_DEFS) if (customFields.includes(f.key)) row[f.key] = rec[f.key]
        if (customAttendance) for (const d of days) {
          const v = att.get(`${b.student_id}|${d.date}`)
          row[`att_${d.date}`] = v === true ? '✓' : v === false ? '✗' : ''
        }
        if (customSignInOut) for (const d of days) { row[`in_${d.date}`] = ''; row[`out_${d.date}`] = '' }
        return row
      })
      return { title: 'Custom Export', columns: cols, rows: r }
    }

    // attendance — recorded present/absent per day from camp_attendance
    const byKey = new Map(attendance.map(a => [`${a.student_id}|${a.attend_date}`, a.present]))
    const cols: ExportColumn[] = [{ key: 'camper', label: 'Camper' }]
    for (const d of days) cols.push({ key: d.date, label: d.label, align: 'center' })
    const r = base.map(b => {
      const row: ExportRow = { camper: b.camper }
      for (const d of days) {
        const v = byKey.get(`${b.student_id}|${d.date}`)
        row[d.date] = v === true ? '✓' : v === false ? '✗' : ''
      }
      return row
    })
    return { title: 'Attendance Record', columns: cols, rows: r }
  }, [dataset, base, days, attendance, customFields, customAttendance, customSignInOut])

  const fileBase = `${camp.name} ${title}`
  const subtitle = `${camp.name} · ${formatCellValue(camp.start_date, 'date')} – ${formatCellValue(camp.end_date, 'date')}`
  const canExport = rows.length > 0 && columns.length > 0

  async function onSheets() {
    const ok = await exportToGoogleSheets(columns, rows)
    setNotice(ok
      ? 'Copied to clipboard — paste into the new Google Sheet tab (Ctrl/Cmd + V).'
      : 'Opened a new Google Sheet. Copy failed — use CSV export and File ▸ Import instead.')
    setTimeout(() => setNotice(''), 9000)
  }

  const DATASETS: { key: DatasetKey; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Camper Information', icon: <Table2 size={15} /> },
    { key: 'medical', label: 'Allergy & Medical', icon: <HeartPulse size={15} /> },
    { key: 'contacts', label: 'Parent Contacts', icon: <ClipboardList size={15} /> },
    { key: 'signinout', label: 'Sign-In / Out Sheet', icon: <ListChecks size={15} /> },
    { key: 'attendance', label: 'Attendance Record', icon: <CalendarCheck size={15} /> },
    { key: 'custom', label: 'Custom…', icon: <SlidersHorizontal size={15} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DATASETS.map(d => (
          <button
            key={d.key}
            onClick={() => setDataset(d.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              dataset === d.key
                ? 'border-studio-500 bg-studio-50 text-studio-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      {dataset === 'custom' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Choose columns</h3>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={() => setCustomFields(FIELD_DEFS.map(f => f.key))} className="text-studio-600 hover:text-studio-700">Select all</button>
              <button onClick={() => setCustomFields([])} className="text-gray-500 hover:text-gray-700">Clear</button>
              <button onClick={() => { setCustomFields(DEFAULT_FIELDS); setCustomAttendance(false); setCustomSignInOut(false) }} className="text-gray-500 hover:text-gray-700">Reset</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
            {FIELD_GROUPS.map(group => (
              <div key={group}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{group}</p>
                {FIELD_DEFS.filter(f => f.group === group).map(f => (
                  <label key={f.key} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={customFields.includes(f.key)} onChange={() => toggleField(f.key)}
                      className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
                    {f.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
            <p className="w-full text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Per-day columns</p>
            <label className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={customAttendance} onChange={e => setCustomAttendance(e.target.checked)}
                className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
              Attendance (recorded ✓/✗ per day)
            </label>
            <label className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={customSignInOut} onChange={e => setCustomSignInOut(e.target.checked)}
                className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
              Sign-In / Sign-Out (blank per day)
            </label>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{rows.length} camper{rows.length === 1 ? '' : 's'} · {subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadCSV(fileBase, columns, rows)} disabled={!canExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => printReport({ title: `${camp.name} — ${title}`, subtitle, columns, rows })} disabled={!canExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Printer size={14} /> Print / PDF
            </button>
            <button onClick={onSheets} disabled={!canExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              <Table2 size={14} /> Google Sheets
            </button>
          </div>
        </div>

        {notice && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-studio-50 border border-studio-200 text-studio-800 text-sm">{notice}</div>
        )}

        {columns.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">Select at least one column above.</div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">No campers registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {columns.map(c => (
                    <th key={c.key} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map(c => {
                      const v = formatCellValue(r[c.key], c.format)
                      return (
                        <td key={c.key} className={`px-4 py-2 text-sm text-gray-700 whitespace-nowrap ${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`}>
                          {v || <span className="text-gray-300">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
