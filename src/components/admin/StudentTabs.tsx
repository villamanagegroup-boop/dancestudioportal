'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  cn, formatDate, formatCurrency, formatTime, getAgeFromDob,
  getEnrollmentStatusColor, getPaymentStatusColor,
} from '@/lib/utils'
import {
  AlertTriangle, Pencil, Trash2, Plus, X, Calendar, Stethoscope,
  Award, Tent, Cake, BookOpen, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import AdminNotesPanel, { type AdminNote } from './AdminNotesPanel'
import AnnouncementBanner from './AnnouncementBanner'
import { showToast } from '@/lib/toast'

export interface StudentRecord {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  association_id: string | null
  registration_anniversary: string | null
  anniversary_fee_override: number | null
  roll_sheet_comment: string | null
  flag_alert: string | null
  medical_notes: string | null
  allergies: string | null
  medications: string | null
  medical_conditions: string | null
  doctor_name: string | null
  doctor_phone: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  shoe_size: string | null
  shirt_size: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  membership_tier: string | null
  tags: string[] | null
  custom_fields: Record<string, string> | null
  photo_url: string | null
  active: boolean
  created_at: string
}

interface Guardian {
  relationship: string
  is_primary: boolean
  guardian: { first_name: string; last_name: string; email: string; phone: string | null } | null
}

interface Enrollment {
  id: string
  status: string
  enrolled_at: string
  dropped_at: string | null
  class: { name: string; day_of_week: string; start_time: string; end_time: string; monthly_tuition: number } | null
}

interface Invoice {
  id: string
  description: string
  amount: number
  status: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  invoice_type: string
}

export interface CampReg {
  id: string
  status: string
  paid_at: string | null
  camp: { id: string; name: string; start_date: string; end_date: string; price: number } | null
}

export interface PartyForStudent {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  package: string | null
  price: number
  status: string
  deposit_paid: boolean
}

export interface Appointment {
  id: string
  appointment_type: string
  title: string | null
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  status: string
  notes: string | null
  instructor: { first_name: string; last_name: string } | null
}

export interface Policy {
  id: string
  name: string
  body: string | null
  required: boolean
  version: number
  acceptance: { accepted_at: string; policy_version: number } | null
}

export interface Membership {
  id: string
  tier: string
  starts_on: string
  ends_on: string | null
  notes: string | null
  created_at: string
}

export interface ActivityEntry {
  id: string
  action: string
  meta: Record<string, unknown> | null
  created_at: string
  actor: { first_name: string; last_name: string } | null
}

interface Props {
  student: StudentRecord
  enrollments: Enrollment[]
  invoices: Invoice[]
  guardians: Guardian[]
  notes: AdminNote[]
  campRegistrations: CampReg[]
  parties: PartyForStudent[]
  appointments: Appointment[]
  policies: Policy[]
  memberships: Membership[]
  activity: ActivityEntry[]
  instructors: Array<{ id: string; first_name: string; last_name: string }>
}

const tabs = ['Profile', 'Medical', 'Enrollments', 'Billing', 'Policies', 'Memberships', 'Notes', 'Activity'] as const
type Tab = typeof tabs[number]

export default function StudentTabs(props: Props) {
  const [active, setActive] = useState<Tab>('Profile')

  const outstanding = props.invoices
    .filter(i => i.status === 'pending' || i.status === 'failed')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const announcements = props.notes.filter(n => n.kind === 'announcement')
  const lastChargedAt = props.invoices.length ? props.invoices[0].created_at : null
  const requiredMissing = props.policies.filter(p => p.required && !p.acceptance).length
  const enrollCount = props.enrollments.length + props.campRegistrations.length + props.parties.length + props.appointments.length

  return (
    <div className="space-y-3">
      {props.student.flag_alert && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Flag</p>
            <p className="text-sm text-red-900 whitespace-pre-wrap">{props.student.flag_alert}</p>
          </div>
        </div>
      )}
      {announcements.length > 0 && <AnnouncementBanner notes={announcements} />}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab => {
              const badge =
                tab === 'Billing' && outstanding > 0 ? formatCurrency(outstanding) :
                tab === 'Enrollments' && enrollCount > 0 ? enrollCount :
                tab === 'Policies' && requiredMissing > 0 ? requiredMissing :
                tab === 'Notes' && props.notes.length > 0 ? props.notes.length :
                null
              return (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={cn(
                    'py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
                    active === tab ? 'border-studio-600 text-studio-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab}
                  {badge !== null && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      tab === 'Billing' ? 'bg-red-100 text-red-700' :
                      tab === 'Policies' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    )}>{badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {active === 'Profile' && <ProfileTab student={props.student} guardians={props.guardians} lastChargedAt={lastChargedAt} />}
          {active === 'Medical' && <MedicalTab student={props.student} />}
          {active === 'Enrollments' && <EnrollmentsTab studentId={props.student.id} enrollments={props.enrollments} campRegs={props.campRegistrations} parties={props.parties} appointments={props.appointments} instructors={props.instructors} />}
          {active === 'Billing' && <BillingTab invoices={props.invoices} student={props.student} outstanding={outstanding} />}
          {active === 'Policies' && <PoliciesTab studentId={props.student.id} policies={props.policies} />}
          {active === 'Memberships' && <MembershipsTab studentId={props.student.id} memberships={props.memberships} />}
          {active === 'Notes' && <AdminNotesPanel apiBase={`/api/students/${props.student.id}`} notes={props.notes} subjectLabel="dancer" supportsVisibility />}
          {active === 'Activity' && <ActivityTab entries={props.activity} />}
        </div>
      </div>
    </div>
  )
}

/* ====== Profile ====================================================== */

function ProfileTab({ student, guardians, lastChargedAt }: { student: StudentRecord; guardians: Guardian[]; lastChargedAt: string | null }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <EditProfileForm student={student} onCancel={() => setEditing(false)} />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-xl">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{student.first_name} {student.last_name}</h2>
            <p className="text-sm text-gray-500">
              {student.active ? 'Active dancer' : 'Inactive'} · Age {getAgeFromDob(student.date_of_birth)}
              {student.grade && ` · Grade ${student.grade}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
            <Pencil size={14} /> Edit
          </button>
          <DeleteStudentButton studentId={student.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Personal">
          <Field label="Full name" value={`${student.first_name} ${student.last_name}`} />
          <Field label="Date of birth" value={formatDate(student.date_of_birth)} />
          <Field label="Age" value={`${getAgeFromDob(student.date_of_birth)} yrs`} />
          <Field label="Gender" value={student.gender ?? '—'} />
          <Field label="Grade" value={student.grade ?? '—'} />
          <Field label="Association ID" value={student.association_id ?? '—'} />
          <Field label="Shoe size" value={student.shoe_size ?? '—'} />
          <Field label="Shirt size" value={student.shirt_size ?? '—'} />
        </Section>

        <Section title="Studio relationship">
          <Field label="Status" value={student.active ? 'Active' : 'Inactive'} />
          <Field label="Membership tier" value={student.membership_tier ?? '—'} />
          <Field label="Anniversary" value={student.registration_anniversary ? `${formatDate(student.registration_anniversary)} · ${yearsSince(student.registration_anniversary)} yrs` : '—'} />
          <Field label="Anniversary fee override" value={student.anniversary_fee_override != null ? formatCurrency(Number(student.anniversary_fee_override)) : '—'} />
          <Field label="Last charged" value={lastChargedAt ? formatDate(lastChargedAt) : 'Never'} />
          <Field label="Joined the studio" value={formatDate(student.created_at)} />
        </Section>
      </div>

      {student.roll_sheet_comment && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 mb-1">Roll sheet comment</p>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap">{student.roll_sheet_comment}</p>
          <p className="text-xs text-yellow-700/70 mt-1">Visible to instructors on attendance roll sheets.</p>
        </div>
      )}

      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {(student.tags ?? []).length === 0 && <span className="text-sm text-gray-400">No tags</span>}
          {(student.tags ?? []).map(t => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-studio-50 text-studio-700">{t}</span>
          ))}
        </div>
      </Section>

      <Section title="Guardians">
        {guardians.length === 0 ? (
          <p className="text-sm text-gray-400">No guardians linked.</p>
        ) : (
          <div className="space-y-2">
            {guardians.map((gs, i) => gs.guardian && (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{gs.guardian.first_name} {gs.guardian.last_name}</p>
                  <p className="text-xs text-gray-500">{gs.guardian.email}{gs.guardian.phone ? ` · ${gs.guardian.phone}` : ''} · {gs.relationship}</p>
                </div>
                {gs.is_primary && <span className="ml-auto text-xs font-medium text-studio-600 bg-studio-50 px-2 py-1 rounded-full">primary</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Custom fields">
        <CustomFieldsEditor studentId={student.id} fields={student.custom_fields ?? {}} />
      </Section>
    </div>
  )
}

function EditProfileForm({ student, onCancel }: { student: StudentRecord; onCancel: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    date_of_birth: student.date_of_birth,
    gender: student.gender ?? '',
    grade: student.grade ?? '',
    association_id: student.association_id ?? '',
    registration_anniversary: student.registration_anniversary ?? '',
    anniversary_fee_override: student.anniversary_fee_override != null ? String(student.anniversary_fee_override) : '',
    roll_sheet_comment: student.roll_sheet_comment ?? '',
    flag_alert: student.flag_alert ?? '',
    shoe_size: student.shoe_size ?? '',
    shirt_size: student.shirt_size ?? '',
    membership_tier: student.membership_tier ?? '',
    tags: (student.tags ?? []).join(', '),
    active: student.active,
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          gender: form.gender || null,
          grade: form.grade || null,
          association_id: form.association_id || null,
          registration_anniversary: form.registration_anniversary || null,
          anniversary_fee_override: form.anniversary_fee_override === '' ? null : Number(form.anniversary_fee_override),
          roll_sheet_comment: form.roll_sheet_comment || null,
          flag_alert: form.flag_alert || null,
          shoe_size: form.shoe_size || null,
          shirt_size: form.shirt_size || null,
          membership_tier: form.membership_tier || null,
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      onCancel()
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required />
        <Input label="Last name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} required />
        <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} required />
        <Input label="Gender" value={form.gender} onChange={v => setForm({ ...form, gender: v })} />
        <Input label="Grade" value={form.grade} onChange={v => setForm({ ...form, grade: v })} placeholder="K, 1, 2, 3…" />
        <Input label="Association ID" value={form.association_id} onChange={v => setForm({ ...form, association_id: v })} placeholder="External / system ID" />
        <Input label="Registration anniversary" type="date" value={form.registration_anniversary} onChange={v => setForm({ ...form, registration_anniversary: v })} />
        <Input label="Anniversary fee override" type="number" value={form.anniversary_fee_override} onChange={v => setForm({ ...form, anniversary_fee_override: v })} placeholder="Optional discount price" />
        <Input label="Shoe size" value={form.shoe_size} onChange={v => setForm({ ...form, shoe_size: v })} />
        <Input label="Shirt size" value={form.shirt_size} onChange={v => setForm({ ...form, shirt_size: v })} />
        <Input label="Membership tier" value={form.membership_tier} onChange={v => setForm({ ...form, membership_tier: v })} placeholder="standard, vip, competition…" />
        <Input label="Tags (comma separated)" value={form.tags} onChange={v => setForm({ ...form, tags: v })} placeholder="competition, scholarship, junior" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Roll sheet comment</label>
        <textarea value={form.roll_sheet_comment} onChange={e => setForm({ ...form, roll_sheet_comment: e.target.value })} rows={2}
          placeholder="Comment shown to instructors on attendance roll sheets"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Flag / alert</label>
        <textarea value={form.flag_alert} onChange={e => setForm({ ...form, flag_alert: e.target.value })} rows={2}
          placeholder="Critical info shown as a banner above the dancer's profile (e.g. 'EpiPen required', 'no photos')"
          className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 focus:outline-none focus:border-red-500" />
      </div>

      <Checkbox label="Active dancer" checked={form.active} onChange={v => setForm({ ...form, active: v })} />

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

function DeleteStudentButton({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doDelete() {
    setBusy(true)
    const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' })
    if (!res.ok) { const j = await res.json(); showToast(j.error ?? 'Failed to delete', 'error'); setBusy(false); return }
    router.push('/students')
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
        <Trash2 size={14} /> Delete
      </button>
    )
  }
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-red-600">Delete dancer permanently?</span>
      <button onClick={doDelete} disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
        {busy ? 'Deleting...' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
    </div>
  )
}

function CustomFieldsEditor({ studentId, fields }: { studentId: string; fields: Record<string, string> }) {
  const router = useRouter()
  const [rows, setRows] = useState<Array<{ k: string; v: string }>>(
    Object.entries(fields).length ? Object.entries(fields).map(([k, v]) => ({ k, v: String(v) })) : []
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const obj: Record<string, string> = {}
    for (const r of rows) if (r.k.trim()) obj[r.k.trim()] = r.v
    await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: obj }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-gray-400">No custom fields.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input value={r.k} onChange={e => { const next = [...rows]; next[i].k = e.target.value; setRows(next) }} placeholder="Field name" className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 w-1/3 focus:outline-none focus:border-studio-500" />
          <input value={r.v} onChange={e => { const next = [...rows]; next[i].v = e.target.value; setRows(next) }} placeholder="Value" className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 flex-1 focus:outline-none focus:border-studio-500" />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={() => setRows([...rows, { k: '', v: '' }])} className="flex items-center gap-1.5 text-sm text-studio-600 hover:text-studio-700">
          <Plus size={14} /> Add field
        </button>
        <button onClick={save} disabled={saving} className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ====== Medical ====================================================== */

function MedicalTab({ student }: { student: StudentRecord }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <EditMedicalForm student={student} onCancel={() => setEditing(false)} />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Stethoscope size={14} /> Medical</h3>
          <p className="text-xs text-gray-500">Sensitive information — admin and instructors of record.</p>
        </div>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
          <Pencil size={14} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Allergies & medications">
          <Field label="Allergies" value={student.allergies ?? '—'} multiline />
          <Field label="Medications" value={student.medications ?? '—'} multiline />
          <Field label="Conditions" value={student.medical_conditions ?? '—'} multiline />
        </Section>
        <Section title="Provider & insurance">
          <Field label="Doctor name" value={student.doctor_name ?? '—'} />
          <Field label="Doctor phone" value={student.doctor_phone ?? '—'} />
          <Field label="Insurance" value={student.insurance_provider ?? '—'} />
          <Field label="Policy #" value={student.insurance_policy_number ?? '—'} />
        </Section>
        <Section title="Emergency contact">
          <Field label="Name" value={student.emergency_contact_name ?? '—'} />
          <Field label="Phone" value={student.emergency_contact_phone ?? '—'} />
        </Section>
        <Section title="General notes">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.medical_notes ?? '—'}</p>
        </Section>
      </div>
    </div>
  )
}

function EditMedicalForm({ student, onCancel }: { student: StudentRecord; onCancel: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    allergies: student.allergies ?? '',
    medications: student.medications ?? '',
    medical_conditions: student.medical_conditions ?? '',
    medical_notes: student.medical_notes ?? '',
    doctor_name: student.doctor_name ?? '',
    doctor_phone: student.doctor_phone ?? '',
    insurance_provider: student.insurance_provider ?? '',
    insurance_policy_number: student.insurance_policy_number ?? '',
    emergency_contact_name: student.emergency_contact_name ?? '',
    emergency_contact_phone: student.emergency_contact_phone ?? '',
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(form)) body[k] = v.trim() || null
    await fetch(`/api/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    onCancel()
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextArea label="Allergies" value={form.allergies} onChange={v => setForm({ ...form, allergies: v })} />
        <TextArea label="Medications" value={form.medications} onChange={v => setForm({ ...form, medications: v })} />
        <TextArea label="Conditions" value={form.medical_conditions} onChange={v => setForm({ ...form, medical_conditions: v })} />
        <TextArea label="General medical notes" value={form.medical_notes} onChange={v => setForm({ ...form, medical_notes: v })} />
        <Input label="Doctor name" value={form.doctor_name} onChange={v => setForm({ ...form, doctor_name: v })} />
        <Input label="Doctor phone" value={form.doctor_phone} onChange={v => setForm({ ...form, doctor_phone: v })} />
        <Input label="Insurance provider" value={form.insurance_provider} onChange={v => setForm({ ...form, insurance_provider: v })} />
        <Input label="Insurance policy #" value={form.insurance_policy_number} onChange={v => setForm({ ...form, insurance_policy_number: v })} />
        <Input label="Emergency contact name" value={form.emergency_contact_name} onChange={v => setForm({ ...form, emergency_contact_name: v })} />
        <Input label="Emergency contact phone" value={form.emergency_contact_phone} onChange={v => setForm({ ...form, emergency_contact_phone: v })} />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save medical info'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

/* ====== Enrollments (classes / camps / birthdays / appointments) ===== */

type EnrollFilter = 'all' | 'classes' | 'camps' | 'birthdays' | 'appointments'

function EnrollmentsTab({
  studentId, enrollments, campRegs, parties, appointments, instructors,
}: {
  studentId: string
  enrollments: Enrollment[]
  campRegs: CampReg[]
  parties: PartyForStudent[]
  appointments: Appointment[]
  instructors: Array<{ id: string; first_name: string; last_name: string }>
}) {
  const [filter, setFilter] = useState<EnrollFilter>('all')
  const [showAppt, setShowAppt] = useState(false)

  const counts = {
    all: enrollments.length + campRegs.length + parties.length + appointments.length,
    classes: enrollments.length,
    camps: campRegs.length,
    birthdays: parties.length,
    appointments: appointments.length,
  }

  const filters: Array<{ key: EnrollFilter; label: string; icon: React.ReactNode }> = [
    { key: 'all', label: 'All', icon: <BookOpen size={13} /> },
    { key: 'classes', label: 'Classes', icon: <Calendar size={13} /> },
    { key: 'camps', label: 'Camps', icon: <Tent size={13} /> },
    { key: 'birthdays', label: 'Birthdays', icon: <Cake size={13} /> },
    { key: 'appointments', label: 'Appointments', icon: <Clock size={13} /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                filter === f.key ? 'bg-white shadow-sm text-studio-700' : 'text-gray-600 hover:text-gray-900'
              )}>
              {f.icon} {f.label}
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowAppt(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700">
          <Plus size={14} /> New appointment
        </button>
      </div>

      {showAppt && <NewAppointmentForm studentId={studentId} instructors={instructors} onClose={() => setShowAppt(false)} />}

      {(filter === 'all' || filter === 'classes') && (
        <Section title="Classes">
          {enrollments.length === 0 ? <p className="text-sm text-gray-400">No class enrollments.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="pb-2">Class</th><th className="pb-2">Schedule</th><th className="pb-2">Tuition</th>
                <th className="pb-2">Status</th><th className="pb-2">Enrolled</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td className="py-2.5 text-gray-900">{e.class?.name ?? '—'}</td>
                    <td className="py-2.5 text-gray-500 capitalize">{e.class ? `${e.class.day_of_week} ${formatTime(e.class.start_time)}` : '—'}</td>
                    <td className="py-2.5">{e.class ? formatCurrency(Number(e.class.monthly_tuition)) + '/mo' : '—'}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>{e.status}</span></td>
                    <td className="py-2.5 text-gray-500">{formatDate(e.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {(filter === 'all' || filter === 'camps') && (
        <Section title="Camps">
          {campRegs.length === 0 ? <p className="text-sm text-gray-400">No camp registrations.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="pb-2">Camp</th><th className="pb-2">Dates</th><th className="pb-2">Price</th><th className="pb-2">Status</th><th className="pb-2">Paid</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {campRegs.map(r => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-gray-900">{r.camp?.name ?? '—'}</td>
                    <td className="py-2.5 text-gray-500">{r.camp ? `${formatDate(r.camp.start_date)} – ${formatDate(r.camp.end_date)}` : '—'}</td>
                    <td className="py-2.5">{r.camp ? formatCurrency(Number(r.camp.price)) : '—'}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(r.status))}>{r.status}</span></td>
                    <td className="py-2.5 text-gray-500">{r.paid_at ? formatDate(r.paid_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {(filter === 'all' || filter === 'birthdays') && (
        <Section title="Birthday parties">
          {parties.length === 0 ? <p className="text-sm text-gray-400">No parties on file.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="pb-2">Date</th><th className="pb-2">Time</th><th className="pb-2">Package</th>
                <th className="pb-2">Price</th><th className="pb-2">Status</th><th className="pb-2">Deposit</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {parties.map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-gray-900">{formatDate(p.event_date)}</td>
                    <td className="py-2.5 text-gray-500">{p.start_time && p.end_time ? `${p.start_time.slice(0,5)} – ${p.end_time.slice(0,5)}` : '—'}</td>
                    <td className="py-2.5">{p.package ?? '—'}</td>
                    <td className="py-2.5 font-medium">{formatCurrency(Number(p.price))}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', getEnrollmentStatusColor(p.status))}>{p.status}</span></td>
                    <td className="py-2.5"><span className={cn('text-xs px-2 py-1 rounded-full', p.deposit_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800')}>{p.deposit_paid ? 'paid' : 'pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {(filter === 'all' || filter === 'appointments') && (
        <Section title="Appointments">
          {appointments.length === 0 ? <p className="text-sm text-gray-400">No appointments scheduled.</p> : (
            <div className="space-y-2">
              {appointments.map(a => <AppointmentRow key={a.id} studentId={studentId} appt={a} />)}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

function AppointmentRow({ studentId, appt }: { studentId: string; appt: Appointment }) {
  const router = useRouter()
  async function cancel() {
    if (!confirm('Cancel this appointment?')) return
    await fetch(`/api/students/${studentId}/appointments/${appt.id}`, { method: 'DELETE' })
    router.refresh()
  }
  const date = new Date(appt.scheduled_at)
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{appt.title || appt.appointment_type.replace(/_/g, ' ')}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          {appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ''}
          {appt.location ? ` · ${appt.location}` : ''}
          {appt.instructor ? ` · ${appt.instructor.first_name} ${appt.instructor.last_name}` : ''}
        </p>
        {appt.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{appt.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs px-2 py-1 rounded-full', getEnrollmentStatusColor(appt.status))}>{appt.status}</span>
        <button onClick={cancel} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
      </div>
    </div>
  )
}

function NewAppointmentForm({ studentId, instructors, onClose }: {
  studentId: string
  instructors: Array<{ id: string; first_name: string; last_name: string }>
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    appointment_type: 'private_lesson', title: '', scheduled_at: '',
    duration_minutes: '60', location: '', instructor_id: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          instructor_id: form.instructor_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      onClose()
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-studio-200 bg-studio-50/30 space-y-3">
      {error && <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Type" value={form.appointment_type} onChange={v => setForm({ ...form, appointment_type: v })}
          options={[
            { value: 'private_lesson', label: 'Private lesson' },
            { value: 'fitting', label: 'Costume fitting' },
            { value: 'evaluation', label: 'Evaluation' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'photo', label: 'Photo / headshot' },
            { value: 'other', label: 'Other' },
          ]} />
        <Input label="Title (optional)" value={form.title} onChange={v => setForm({ ...form, title: v })} />
        <Input label="Date / time" type="datetime-local" value={form.scheduled_at} onChange={v => setForm({ ...form, scheduled_at: v })} required />
        <Input label="Duration (minutes)" type="number" value={form.duration_minutes} onChange={v => setForm({ ...form, duration_minutes: v })} />
        <Input label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="Studio A, Zoom, etc." />
        <Select label="Instructor (optional)" value={form.instructor_id} onChange={v => setForm({ ...form, instructor_id: v })}
          options={[{ value: '', label: '—' }, ...instructors.map(i => ({ value: i.id, label: `${i.first_name} ${i.last_name}` }))]} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
          {busy ? 'Scheduling...' : 'Schedule'}
        </button>
      </div>
    </form>
  )
}

/* ====== Billing ====================================================== */

function BillingTab({ invoices, student, outstanding }: { invoices: Invoice[]; student: StudentRecord; outstanding: number }) {
  const lastChargeDate = invoices[0]?.created_at ?? null
  const lifetime = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding" value={formatCurrency(outstanding)} accent={outstanding > 0 ? 'red' : 'gray'} />
        <Stat label="Lifetime paid (this dancer)" value={formatCurrency(lifetime)} accent="green" />
        <Stat label="Last charged" value={lastChargeDate ? formatDate(lastChargeDate) : 'Never'} accent="gray" />
      </div>

      {student.anniversary_fee_override != null && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <strong>Anniversary fee override:</strong> {formatCurrency(Number(student.anniversary_fee_override))}
          <p className="text-xs text-amber-700/80 mt-0.5">Use this rate when generating anniversary-tied charges for this dancer.</p>
        </div>
      )}

      {outstanding > 0 && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-orange-800">Outstanding balance: {formatCurrency(outstanding)}</p>
          <Link href="/billing" className="text-sm text-orange-700 hover:underline">Open billing →</Link>
        </div>
      )}

      <Section title="Invoices for this dancer">
        {invoices.length === 0 ? <p className="text-sm text-gray-400">No invoices.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              <th className="pb-2">Description</th><th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Due</th><th className="pb-2">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="py-2.5 text-gray-900">{inv.description}</td>
                  <td className="py-2.5 text-gray-500 capitalize">{inv.invoice_type}</td>
                  <td className="py-2.5 font-medium">{formatCurrency(Number(inv.amount))}</td>
                  <td className="py-2.5 text-gray-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                  <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full', getPaymentStatusColor(inv.status))}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

/* ====== Policies ===================================================== */

function PoliciesTab({ studentId, policies }: { studentId: string; policies: Policy[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(policyId: string, accept: boolean) {
    setBusy(policyId)
    await fetch(`/api/students/${studentId}/policies/${policyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setBusy(null)
    router.refresh()
  }

  if (policies.length === 0) return <p className="text-sm text-gray-400">No policies configured.</p>

  return (
    <div className="space-y-3">
      {policies.map(p => {
        const accepted = !!p.acceptance
        const stale = accepted && p.acceptance!.policy_version !== p.version
        return (
          <div key={p.id} className={cn(
            'p-4 rounded-xl border flex items-start gap-4',
            accepted && !stale ? 'border-green-200 bg-green-50/30' :
            stale ? 'border-amber-200 bg-amber-50/30' :
            p.required ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'
          )}>
            <div className="mt-1">
              {accepted && !stale ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertCircle size={18} className={p.required ? 'text-orange-500' : 'text-gray-400'} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">v{p.version}</span>
                {p.required && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">required</span>}
              </div>
              {p.body && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.body}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {accepted ? <>Accepted {formatDate(p.acceptance!.accepted_at)} (v{p.acceptance!.policy_version}{stale ? ' — outdated' : ''})</> : <>Not accepted</>}
              </p>
            </div>
            <button onClick={() => toggle(p.id, !accepted || stale)} disabled={busy === p.id}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50',
                accepted && !stale ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-studio-600 text-white hover:bg-studio-700'
              )}>
              {busy === p.id ? '...' : accepted && !stale ? 'Reset' : 'Mark accepted'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ====== Memberships ================================================== */

function MembershipsTab({ studentId, memberships }: { studentId: string; memberships: Membership[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ tier: '', starts_on: '', ends_on: '', notes: '' })
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await fetch(`/api/students/${studentId}/memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false); setAdding(false)
    setForm({ tier: '', starts_on: '', ends_on: '', notes: '' })
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Remove this membership record?')) return
    await fetch(`/api/students/${studentId}/memberships/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const today = new Date().toISOString().slice(0, 10)
  const isActive = (m: Membership) => m.starts_on <= today && (!m.ends_on || m.ends_on >= today)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700">
            <Plus size={14} /> Add membership
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="p-4 rounded-xl border border-studio-200 bg-studio-50/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Tier" value={form.tier} onChange={v => setForm({ ...form, tier: v })} required placeholder="standard, vip, competition…" />
            <Input label="Starts on" type="date" value={form.starts_on} onChange={v => setForm({ ...form, starts_on: v })} required />
            <Input label="Ends on (optional)" type="date" value={form.ends_on} onChange={v => setForm({ ...form, ends_on: v })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
              {busy ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {memberships.length === 0 ? (
        <p className="text-sm text-gray-400">No memberships on file.</p>
      ) : (
        <div className="space-y-2">
          {memberships.map(m => (
            <div key={m.id} className={cn(
              'p-3 rounded-lg border flex items-start justify-between',
              isActive(m) ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
            )}>
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Award size={14} className={isActive(m) ? 'text-green-600' : 'text-gray-400'} />
                  {m.tier}
                  {isActive(m) && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">active</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(m.starts_on)} – {m.ends_on ? formatDate(m.ends_on) : 'ongoing'}
                </p>
                {m.notes && <p className="text-xs text-gray-600 mt-1">{m.notes}</p>}
              </div>
              <button onClick={() => remove(m.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ====== Activity ===================================================== */

function ActivityTab({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-gray-400">No activity recorded.</p>
  return (
    <div className="space-y-2">
      {entries.map(e => (
        <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
          <Clock size={14} className="text-gray-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium capitalize">{e.action.replace(/_/g, ' ')}</span>
              {e.actor && <span className="text-gray-500"> by {e.actor.first_name} {e.actor.last_name}</span>}
            </p>
            <p className="text-xs text-gray-500">{formatDate(e.created_at)}</p>
            {e.meta && Object.keys(e.meta).length > 0 && (
              <pre className="mt-1 text-[11px] text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">{JSON.stringify(e.meta, null, 2)}</pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ====== Atoms ======================================================== */

function yearsSince(date: string): number {
  const d = new Date(date), now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--
  return Math.max(0, years)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'red' | 'green' | 'gray' }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-semibold mt-1',
        accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : 'text-gray-900'
      )}>{value}</p>
    </div>
  )
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-2 py-1.5">
      <dt className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</dt>
      <dd className={cn('text-sm text-gray-900 font-medium flex-1', multiline && 'whitespace-pre-wrap')}>{value}</dd>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded text-studio-600 focus:ring-studio-500" />
      {label}
    </label>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
