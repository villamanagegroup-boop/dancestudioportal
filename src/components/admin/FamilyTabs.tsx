'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail, Phone, MapPin, Tag as TagIcon, Pencil, Trash2, Plus, X, ChevronRight,
  CheckCircle2, AlertCircle, Send, MessageSquare, Clock, FileText, Calendar, UserPlus, Sparkles,
  CreditCard, Tent, Cake, Receipt, DollarSign, BookOpen,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, formatTime, getAgeFromDob, getPaymentStatusColor, getEnrollmentStatusColor } from '@/lib/utils'
import AdminNotesPanel from './AdminNotesPanel'
import { showToast } from '@/lib/toast'
import AnnouncementBanner from './AnnouncementBanner'

export interface FamilyProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  secondary_email: string | null
  secondary_phone: string | null
  sms_opt_in: boolean
  email_opt_in: boolean
  tags: string[] | null
  custom_fields: Record<string, string> | null
  registration_anniversary: string | null
  created_at: string
}

interface LinkedStudent {
  relationship: string
  is_primary: boolean
  student: { id: string; first_name: string; last_name: string; date_of_birth: string; active: boolean } | null
}

interface SecondaryGuardian {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  shared_students: string[]
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

interface Payment {
  id: string
  amount: number
  paid_at: string
  payment_method_last_four: string | null
  refunded_at: string | null
}

interface Policy {
  id: string
  name: string
  body: string | null
  required: boolean
  version: number
  acceptance: { accepted_at: string; policy_version: number } | null
}

interface FamilyNote {
  id: string
  body: string
  pinned: boolean
  kind: 'note' | 'announcement'
  created_at: string
  author: { first_name: string; last_name: string } | null
}

interface CommLogEntry {
  id: string
  direction: string
  channel: string
  subject: string | null
  body: string | null
  occurred_at: string
  staff: { first_name: string; last_name: string } | null
}

interface BroadcastEntry {
  id: string
  subject: string | null
  body: string
  comm_type: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
}

interface ActivityEntry {
  id: string
  action: string
  meta: Record<string, unknown> | null
  created_at: string
  actor: { first_name: string; last_name: string } | null
}

export interface PaymentMethodRow {
  id: string
  last_four: string | null
  card_brand: string | null
  is_default: boolean
  created_at: string
}

export interface ClassEnrollmentRow {
  id: string
  status: string
  enrolled_at: string
  student: { id: string; first_name: string; last_name: string } | null
  class: { id: string; name: string; day_of_week: string; start_time: string; end_time: string; monthly_tuition: number } | null
}

export interface CampRegistrationRow {
  id: string
  status: string
  paid_at: string | null
  student: { id: string; first_name: string; last_name: string } | null
  camp: { id: string; name: string; start_date: string; end_date: string; price: number } | null
}

export interface PartyRow {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  package: string | null
  price: number
  status: string
  deposit_paid: boolean
}

export interface BookingRow {
  id: string
  title: string
  booking_date: string
  start_time: string | null
  end_time: string | null
  booking_type: string
  price: number
  status: string
}

export interface FamilyAppointment {
  id: string
  appointment_type: string
  title: string | null
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  status: string
  notes: string | null
  student: { first_name: string; last_name: string } | null
  instructor: { first_name: string; last_name: string } | null
}

interface Props {
  profile: FamilyProfile
  linkedStudents: LinkedStudent[]
  secondaryGuardians: SecondaryGuardian[]
  invoices: Invoice[]
  payments: Payment[]
  paymentMethods: PaymentMethodRow[]
  classEnrollments: ClassEnrollmentRow[]
  campRegistrations: CampRegistrationRow[]
  parties: PartyRow[]
  bookings: BookingRow[]
  appointments: FamilyAppointment[]
  policies: Policy[]
  notes: FamilyNote[]
  commLog: CommLogEntry[]
  broadcasts: BroadcastEntry[]
  activity: ActivityEntry[]
}

const tabs = ['Overview', 'Billing', 'Enrollments', 'Policies', 'Notes', 'Communications', 'Activity'] as const
type Tab = typeof tabs[number]

export default function FamilyTabs(props: Props) {
  const [active, setActive] = useState<Tab>('Overview')

  const outstanding = props.invoices
    .filter(i => i.status === 'pending' || i.status === 'failed')
    .reduce((s, i) => s + Number(i.amount), 0)

  const paidYTD = props.payments
    .filter(p => !p.refunded_at && new Date(p.paid_at).getFullYear() === new Date().getFullYear())
    .reduce((s, p) => s + Number(p.amount), 0)

  const requiredMissing = props.policies.filter(p => p.required && !p.acceptance).length
  const announcements = props.notes.filter(n => n.kind === 'announcement')

  return (
    <div className="space-y-3">
    {announcements.length > 0 && <AnnouncementBanner notes={announcements} />}
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-5">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map(tab => {
            const enrollmentCount = props.classEnrollments.length + props.campRegistrations.length + props.parties.length + props.bookings.length + props.appointments.length
            const badge =
              tab === 'Billing' && outstanding > 0 ? formatCurrency(outstanding) :
              tab === 'Enrollments' && enrollmentCount > 0 ? enrollmentCount :
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
        {active === 'Overview' && <OverviewTab profile={props.profile} linkedStudents={props.linkedStudents} secondaryGuardians={props.secondaryGuardians} outstanding={outstanding} paidYTD={paidYTD} />}
        {active === 'Billing' && <BillingTab familyId={props.profile.id} invoices={props.invoices} payments={props.payments} paymentMethods={props.paymentMethods} linkedStudents={props.linkedStudents} outstanding={outstanding} />}
        {active === 'Enrollments' && <EnrollmentsTab classEnrollments={props.classEnrollments} campRegistrations={props.campRegistrations} parties={props.parties} bookings={props.bookings} appointments={props.appointments} />}
        {active === 'Policies' && <PoliciesTab familyId={props.profile.id} policies={props.policies} />}
        {active === 'Notes' && <NotesTab familyId={props.profile.id} notes={props.notes} />}
        {active === 'Communications' && <CommunicationsTab familyId={props.profile.id} profile={props.profile} log={props.commLog} broadcasts={props.broadcasts} />}
        {active === 'Activity' && <ActivityTab entries={props.activity} />}
      </div>
    </div>
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* Overview                                                              */
/* --------------------------------------------------------------------- */

function OverviewTab({
  profile, linkedStudents, secondaryGuardians, outstanding, paidYTD,
}: {
  profile: FamilyProfile
  linkedStudents: LinkedStudent[]
  secondaryGuardians: SecondaryGuardian[]
  outstanding: number
  paidYTD: number
}) {
  const [editing, setEditing] = useState(false)
  if (editing) return <EditProfileForm profile={profile} onCancel={() => setEditing(false)} />

  const fullAddress = [profile.address_street, [profile.address_city, profile.address_state].filter(Boolean).join(', '), profile.address_zip].filter(Boolean).join(' · ')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-xl">
            {profile.first_name[0]}{profile.last_name[0]}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{profile.first_name} {profile.last_name}</h2>
            <p className="text-sm text-gray-500">Account created {formatDate(profile.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
            <Pencil size={14} /> Edit
          </button>
          <DeleteFamilyButton familyId={profile.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding" value={formatCurrency(outstanding)} accent={outstanding > 0 ? 'red' : 'gray'} />
        <Stat label="Paid this year" value={formatCurrency(paidYTD)} accent="green" />
        <Stat label="Linked dancers" value={linkedStudents.filter(ls => ls.student).length} accent="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Contact">
          <Row icon={<Mail size={14} />} label="Primary email" value={profile.email} />
          {profile.secondary_email && <Row icon={<Mail size={14} />} label="Secondary email" value={profile.secondary_email} />}
          <Row icon={<Phone size={14} />} label="Primary phone" value={profile.phone ?? '—'} />
          {profile.secondary_phone && <Row icon={<Phone size={14} />} label="Secondary phone" value={profile.secondary_phone} />}
          <Row icon={<MapPin size={14} />} label="Address" value={fullAddress || '—'} />
          <Row
            icon={<Calendar size={14} />}
            label="Registered since"
            value={profile.registration_anniversary
              ? `${formatDate(profile.registration_anniversary)} · ${yearsSince(profile.registration_anniversary)} yr${yearsSince(profile.registration_anniversary) === 1 ? '' : 's'}`
              : '—'}
          />
          <div className="flex gap-2 pt-2">
            <Pill on={profile.email_opt_in} label="Email opt-in" />
            <Pill on={profile.sms_opt_in} label="SMS opt-in" />
          </div>
        </Section>

        <Section title="Tags & memberships">
          <div className="flex flex-wrap gap-1.5">
            {(profile.tags ?? []).length === 0 && <span className="text-sm text-gray-400">No tags</span>}
            {(profile.tags ?? []).map(t => (
              <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-studio-50 text-studio-700">
                <TagIcon size={11} /> {t}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Edit tags via the Edit button above. Common uses: <em>autopay, sibling-discount, recital, scholarship, vip</em>.</p>
        </Section>
      </div>

      <Section title="Dancers">
        <AddDancerForm familyId={profile.id} />
        {linkedStudents.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">No dancers linked. Use the form above to add a new dancer or link an existing one below.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {linkedStudents.filter(ls => ls.student).map(({ student, relationship, is_primary }) => (
              <div key={student!.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 text-xs font-semibold">
                    {student!.first_name[0]}{student!.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {student!.first_name} {student!.last_name}
                      {is_primary && <span className="ml-2 text-xs text-studio-600 bg-studio-50 px-1.5 py-0.5 rounded-full">primary</span>}
                      {!student!.active && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">inactive</span>}
                    </p>
                    <p className="text-xs text-gray-500">Age {getAgeFromDob(student!.date_of_birth)} · {relationship}</p>
                  </div>
                </div>
                <Link href={`/students/${student!.id}`} className="text-gray-400 hover:text-gray-600"><ChevronRight size={16} /></Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      <AdultDancerSection profile={profile} linkedStudents={linkedStudents} />

      <Section title="Other guardians" subtitle="Other parents/guardians sharing dancers with this family">
        {secondaryGuardians.length === 0 ? (
          <p className="text-sm text-gray-400">No other guardians on file.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {secondaryGuardians.map(g => (
              <div key={g.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.first_name} {g.last_name}</p>
                  <p className="text-xs text-gray-500">{g.email}{g.phone ? ` · ${g.phone}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Shares: {g.shared_students.join(', ')}</p>
                </div>
                <Link href={`/families/${g.id}`} className="text-gray-400 hover:text-gray-600"><ChevronRight size={16} /></Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Custom fields">
        <CustomFieldsEditor familyId={profile.id} fields={profile.custom_fields ?? {}} />
      </Section>
    </div>
  )
}

function EditProfileForm({ profile, onCancel }: { profile: FamilyProfile; onCancel: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    phone: profile.phone ?? '',
    secondary_email: profile.secondary_email ?? '',
    secondary_phone: profile.secondary_phone ?? '',
    address_street: profile.address_street ?? '',
    address_city: profile.address_city ?? '',
    address_state: profile.address_state ?? '',
    address_zip: profile.address_zip ?? '',
    sms_opt_in: profile.sms_opt_in,
    email_opt_in: profile.email_opt_in,
    tags: (profile.tags ?? []).join(', '),
    registration_anniversary: profile.registration_anniversary ?? '',
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/families/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          secondary_email: form.secondary_email || null,
          secondary_phone: form.secondary_phone || null,
          address_street: form.address_street || null,
          address_city: form.address_city || null,
          address_state: form.address_state || null,
          address_zip: form.address_zip || null,
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
          registration_anniversary: form.registration_anniversary || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update')
      onCancel()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required />
        <Input label="Last name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} required />
        <Input label="Primary email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
        <Input label="Primary phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
        <Input label="Secondary email" type="email" value={form.secondary_email} onChange={v => setForm({ ...form, secondary_email: v })} />
        <Input label="Secondary phone" value={form.secondary_phone} onChange={v => setForm({ ...form, secondary_phone: v })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="sm:col-span-3"><Input label="Street" value={form.address_street} onChange={v => setForm({ ...form, address_street: v })} /></div>
        <div className="sm:col-span-2"><Input label="City" value={form.address_city} onChange={v => setForm({ ...form, address_city: v })} /></div>
        <div className="sm:col-span-1"><Input label="State" value={form.address_state} onChange={v => setForm({ ...form, address_state: v })} /></div>
        <div className="sm:col-span-2"><Input label="ZIP" value={form.address_zip} onChange={v => setForm({ ...form, address_zip: v })} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Tags (comma separated)" value={form.tags} onChange={v => setForm({ ...form, tags: v })} placeholder="autopay, sibling-discount, vip" />
        <Input label="Registration anniversary" type="date" value={form.registration_anniversary} onChange={v => setForm({ ...form, registration_anniversary: v })} />
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox label="Email opt-in" checked={form.email_opt_in} onChange={v => setForm({ ...form, email_opt_in: v })} />
        <Checkbox label="SMS opt-in" checked={form.sms_opt_in} onChange={v => setForm({ ...form, sms_opt_in: v })} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

function DeleteFamilyButton({ familyId }: { familyId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/families/${familyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        showToast(json.error ?? 'Failed to delete', 'error')
        setBusy(false)
        return
      }
      router.push('/families')
    } catch {
      setBusy(false)
    }
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
      <span className="text-xs text-red-600">Delete account permanently?</span>
      <button onClick={doDelete} disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
        {busy ? 'Deleting...' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
    </div>
  )
}

function CustomFieldsEditor({ familyId, fields }: { familyId: string; fields: Record<string, string> }) {
  const router = useRouter()
  const [rows, setRows] = useState<Array<{ k: string; v: string }>>(
    Object.entries(fields).length ? Object.entries(fields).map(([k, v]) => ({ k, v: String(v) })) : []
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const obj: Record<string, string> = {}
    for (const r of rows) if (r.k.trim()) obj[r.k.trim()] = r.v
    await fetch(`/api/families/${familyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: obj }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-gray-400">No custom fields. Add one below.</p>}
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

/* --------------------------------------------------------------------- */
/* Billing                                                               */
/* --------------------------------------------------------------------- */

function BillingTab({
  familyId, invoices, payments, paymentMethods, linkedStudents, outstanding,
}: {
  familyId: string
  invoices: Invoice[]
  payments: Payment[]
  paymentMethods: PaymentMethodRow[]
  linkedStudents: LinkedStudent[]
  outstanding: number
}) {
  const [panel, setPanel] = useState<null | 'charge' | 'payment' | 'card'>(null)

  // Build the ledger: interleave invoices (debit) and payments (credit), oldest first, with running balance.
  const events = [
    ...invoices.map(i => ({
      sort: i.created_at,
      kind: 'invoice' as const,
      label: i.description,
      sub: i.invoice_type,
      amount: Number(i.amount),
      sign: 1 as const,
      status: i.status,
      id: i.id,
    })),
    ...payments.map(p => ({
      sort: p.paid_at,
      kind: 'payment' as const,
      label: p.refunded_at ? 'Refund' : 'Payment received',
      sub: p.payment_method_last_four ? `•••• ${p.payment_method_last_four}` : '—',
      amount: Number(p.amount),
      sign: p.refunded_at ? 1 : (-1 as const),
      status: p.refunded_at ? 'refunded' : 'paid',
      id: p.id,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort))

  const ledger = events
    .reduce<Array<typeof events[number] & { balance: number }>>((acc, e) => {
      const prev = acc.length ? acc[acc.length - 1].balance : 0
      const balance = prev + (e.sign === 1 ? e.amount : -e.amount)
      acc.push({ ...e, balance })
      return acc
    }, [])
    .reverse()

  const lifetimePaid = payments.filter(p => !p.refunded_at).reduce((s, p) => s + Number(p.amount), 0)
  const totalCharged = invoices.reduce((s, i) => s + Number(i.amount), 0)

  const openInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'failed')
  const studentOptions = linkedStudents.filter(ls => ls.student).map(ls => ({ id: ls.student!.id, name: `${ls.student!.first_name} ${ls.student!.last_name}` }))

  return (
    <div className="space-y-6">
      {outstanding > 0 && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-orange-800">Outstanding balance: {formatCurrency(outstanding)}</p>
          <Link href="/billing" className="text-sm text-orange-700 hover:underline">Open billing →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding" value={formatCurrency(outstanding)} accent={outstanding > 0 ? 'red' : 'gray'} />
        <Stat label="Lifetime paid" value={formatCurrency(lifetimePaid)} accent="green" />
        <Stat label="Total charged" value={formatCurrency(totalCharged)} accent="gray" />
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionBtn icon={<Receipt size={14} />} label="Add charge" active={panel === 'charge'} onClick={() => setPanel(panel === 'charge' ? null : 'charge')} />
        <ActionBtn icon={<DollarSign size={14} />} label="Take payment" active={panel === 'payment'} onClick={() => setPanel(panel === 'payment' ? null : 'payment')} />
        <ActionBtn icon={<CreditCard size={14} />} label="Add card on file" active={panel === 'card'} onClick={() => setPanel(panel === 'card' ? null : 'card')} />
      </div>

      {panel === 'charge' && <AddChargeForm familyId={familyId} students={studentOptions} onClose={() => setPanel(null)} />}
      {panel === 'payment' && <TakePaymentForm familyId={familyId} openInvoices={openInvoices} cards={paymentMethods} onClose={() => setPanel(null)} />}
      {panel === 'card' && <AddCardForm familyId={familyId} onClose={() => setPanel(null)} />}

      <Section title="Cards on file">
        {paymentMethods.length === 0 ? (
          <p className="text-sm text-gray-400">No cards saved.</p>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(pm => <CardRow key={pm.id} familyId={familyId} pm={pm} />)}
          </div>
        )}
      </Section>

      <Section title="Ledger" subtitle="Most recent first; running balance shown after each event">
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-400">No billing activity yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Charge</th>
                <th className="pb-2 text-right">Payment</th>
                <th className="pb-2 text-right">Balance</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledger.map(e => (
                <tr key={`${e.kind}-${e.id}`}>
                  <td className="py-2.5 text-gray-500">{formatDate(e.sort)}</td>
                  <td className="py-2.5 text-gray-900">{e.label}</td>
                  <td className="py-2.5 text-gray-500 capitalize">{e.sub}</td>
                  <td className="py-2.5 text-right font-medium text-gray-900">
                    {e.kind === 'invoice' ? formatCurrency(e.amount) : '—'}
                  </td>
                  <td className="py-2.5 text-right font-medium text-green-700">
                    {e.kind === 'payment' && e.sign === -1 ? formatCurrency(e.amount) : '—'}
                  </td>
                  <td className={cn('py-2.5 text-right font-semibold', e.balance > 0 ? 'text-red-600' : e.balance < 0 ? 'text-green-700' : 'text-gray-700')}>
                    {formatCurrency(Math.abs(e.balance))}{e.balance < 0 ? ' CR' : ''}
                  </td>
                  <td className="py-2.5">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getPaymentStatusColor(e.status))}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function ActionBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors',
      active ? 'bg-studio-50 border-studio-300 text-studio-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    )}>
      {icon} {label}
    </button>
  )
}

function CardRow({ familyId, pm }: { familyId: string; pm: PaymentMethodRow }) {
  const router = useRouter()
  async function remove() {
    if (!confirm('Remove this card?')) return
    await fetch(`/api/families/${familyId}/payment-methods?pm_id=${pm.id}`, { method: 'DELETE' })
    router.refresh()
  }
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
      <div className="flex items-center gap-3">
        <CreditCard size={16} className="text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {pm.card_brand ?? 'Card'} •••• {pm.last_four ?? '????'}
            {pm.is_default && <span className="ml-2 text-xs text-studio-700 bg-studio-50 px-1.5 py-0.5 rounded-full">default</span>}
          </p>
          <p className="text-xs text-gray-500">Added {formatDate(pm.created_at)}</p>
        </div>
      </div>
      <button onClick={remove} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
    </div>
  )
}

function AddChargeForm({ familyId, students, onClose }: {
  familyId: string
  students: Array<{ id: string; name: string }>
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({ description: '', amount: '', invoice_type: 'tuition', due_date: '', student_id: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          due_date: form.due_date || null,
          student_id: form.student_id || null,
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
        <Input label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} required placeholder="May tuition · Ballet 2" />
        <Input label="Amount" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required placeholder="125.00" />
        <Select label="Type" value={form.invoice_type} onChange={v => setForm({ ...form, invoice_type: v })}
          options={[
            { value: 'tuition', label: 'Tuition' }, { value: 'registration', label: 'Registration' },
            { value: 'costume', label: 'Costume' }, { value: 'recital', label: 'Recital' },
            { value: 'retail', label: 'Retail' }, { value: 'other', label: 'Other' },
          ]} />
        <Input label="Due date (optional)" type="date" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} />
        {students.length > 0 && (
          <Select label="For dancer (optional)" value={form.student_id} onChange={v => setForm({ ...form, student_id: v })}
            options={[{ value: '', label: '— Family-level —' }, ...students.map(s => ({ value: s.id, label: s.name }))]} />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
          {busy ? 'Saving...' : 'Add charge'}
        </button>
      </div>
    </form>
  )
}

function TakePaymentForm({ familyId, openInvoices, cards, onClose }: {
  familyId: string
  openInvoices: Invoice[]
  cards: PaymentMethodRow[]
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({ amount: '', invoice_id: '', method_last_four: '', paid_at: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pickInvoice(id: string) {
    const inv = openInvoices.find(i => i.id === id)
    setForm(f => ({ ...f, invoice_id: id, amount: inv ? String(inv.amount) : f.amount }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(form.amount),
          invoice_id: form.invoice_id || null,
          method_last_four: form.method_last_four || null,
          paid_at: form.paid_at || null,
          notes: form.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      onClose()
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-green-200 bg-green-50/30 space-y-3">
      {error && <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Amount" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required placeholder="125.00" />
        <Select label="Apply to invoice (optional)" value={form.invoice_id} onChange={pickInvoice}
          options={[
            { value: '', label: '— Apply to balance —' },
            ...openInvoices.map(i => ({ value: i.id, label: `${i.description} · ${formatCurrency(Number(i.amount))}` })),
          ]} />
        <Select label="Card on file" value={form.method_last_four} onChange={v => setForm({ ...form, method_last_four: v })}
          options={[
            { value: '', label: '— Cash / check / other —' },
            ...cards.filter(c => c.last_four).map(c => ({ value: c.last_four!, label: `${c.card_brand ?? 'Card'} •••• ${c.last_four}` })),
          ]} />
        <Input label="Paid on (optional)" type="date" value={form.paid_at} onChange={v => setForm({ ...form, paid_at: v })} />
      </div>
      <Input label="Notes (optional)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {busy ? 'Recording...' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}

function AddCardForm({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({ last_four: '', card_brand: 'Visa', is_default: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      onClose()
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
      {error && <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <p className="text-xs text-gray-500">
        Manual entry creates a non-chargeable record. Live card capture (Stripe SetupIntent) is wired separately when Stripe keys are configured.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Last 4 digits" value={form.last_four} onChange={v => setForm({ ...form, last_four: v.replace(/\D/g, '').slice(0, 4) })} required placeholder="4242" />
        <Select label="Brand" value={form.card_brand} onChange={v => setForm({ ...form, card_brand: v })}
          options={['Visa', 'Mastercard', 'Amex', 'Discover', 'Other'].map(b => ({ value: b, label: b }))} />
        <div className="flex items-end">
          <Checkbox label="Set as default" checked={form.is_default} onChange={v => setForm({ ...form, is_default: v })} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy || form.last_four.length !== 4} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Saving...' : 'Save card'}
        </button>
      </div>
    </form>
  )
}

/* --------------------------------------------------------------------- */
/* Policies                                                              */
/* --------------------------------------------------------------------- */

function PoliciesTab({ familyId, policies }: { familyId: string; policies: Policy[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(policyId: string, accept: boolean) {
    setBusy(policyId)
    await fetch(`/api/families/${familyId}/policies/${policyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setBusy(null)
    router.refresh()
  }

  if (policies.length === 0) {
    return <p className="text-sm text-gray-400">No policies are configured. Add one in <Link className="text-studio-600 underline" href="/settings">Settings</Link>.</p>
  }

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
                {accepted
                  ? <>Accepted {formatDate(p.acceptance!.accepted_at)} (v{p.acceptance!.policy_version}{stale ? ' — outdated' : ''})</>
                  : <>Not accepted</>}
              </p>
            </div>
            <button
              onClick={() => toggle(p.id, !accepted || stale)}
              disabled={busy === p.id}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50',
                accepted && !stale ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-studio-600 text-white hover:bg-studio-700'
              )}
            >
              {busy === p.id ? '...' : accepted && !stale ? 'Reset' : 'Mark accepted'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* Notes                                                                 */
/* --------------------------------------------------------------------- */

function NotesTab({ familyId, notes }: { familyId: string; notes: FamilyNote[] }) {
  return <AdminNotesPanel apiBase={`/api/families/${familyId}`} notes={notes} subjectLabel="family" />
}

/* --------------------------------------------------------------------- */
/* Communications                                                        */
/* --------------------------------------------------------------------- */

function CommunicationsTab({ familyId, profile, log, broadcasts }: { familyId: string; profile: FamilyProfile; log: CommLogEntry[]; broadcasts: BroadcastEntry[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ direction: 'outbound', channel: 'email', subject: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function logComm(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to log')
      setForm({ direction: 'outbound', channel: 'email', subject: '', body: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <SendEmailPanel familyId={familyId} profile={profile} />

      <Section title="Log a touchpoint">
        <form onSubmit={logComm} className="space-y-3">
          {error && <div className="p-2 text-sm rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Direction" value={form.direction} onChange={v => setForm({ ...form, direction: v })}
              options={[{ value: 'outbound', label: 'Outbound' }, { value: 'inbound', label: 'Inbound' }]} />
            <Select label="Channel" value={form.channel} onChange={v => setForm({ ...form, channel: v })}
              options={[
                { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' },
                { value: 'phone', label: 'Phone call' }, { value: 'in_person', label: 'In person' },
                { value: 'note', label: 'Other' },
              ]} />
          </div>
          <Input label="Subject (optional)" value={form.subject} onChange={v => setForm({ ...form, subject: v })} />
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Summary</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
          </div>
          <button type="submit" disabled={busy || !form.body.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
            <Send size={14} /> {busy ? 'Saving...' : 'Log communication'}
          </button>
        </form>
      </Section>

      <Section title="Touchpoint history">
        {log.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing logged yet.</p>
        ) : (
          <div className="space-y-2">
            {log.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ChannelIcon channel={c.channel} />
                  <span className="capitalize">{c.channel.replace('_', ' ')}</span>
                  <span>·</span>
                  <span className="capitalize">{c.direction}</span>
                  <span>·</span>
                  <span>{formatDate(c.occurred_at)}</span>
                  {c.staff && <><span>·</span><span>{c.staff.first_name} {c.staff.last_name}</span></>}
                </div>
                {c.subject && <p className="text-sm font-medium text-gray-900 mt-1">{c.subject}</p>}
                {c.body && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.body}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Broadcasts received" subtitle="Group messages this family was a recipient of">
        {broadcasts.length === 0 ? (
          <p className="text-sm text-gray-400">No broadcasts.</p>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText size={12} />
                  <span className="capitalize">{b.comm_type}</span>
                  {b.sent_at && <><span>·</span><span>{formatDate(b.sent_at)}</span></>}
                  {b.opened_at ? <span className="text-green-600">opened</span> : b.delivered_at ? <span>delivered</span> : <span className="text-gray-400">queued</span>}
                </div>
                {b.subject && <p className="text-sm font-medium text-gray-900 mt-1">{b.subject}</p>}
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{b.body}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={12} />
  if (channel === 'sms') return <MessageSquare size={12} />
  if (channel === 'phone') return <Phone size={12} />
  return <FileText size={12} />
}

/* --------------------------------------------------------------------- */
/* Activity                                                              */
/* --------------------------------------------------------------------- */

function ActivityTab({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No activity recorded.</p>
  }
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

/* --------------------------------------------------------------------- */
/* Add new dancer (Overview)                                             */
/* --------------------------------------------------------------------- */

function AddDancerForm({ familyId }: { familyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '',
    relationship: 'parent', is_primary: true,
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/dancers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setOpen(false)
      setForm({ first_name: '', last_name: '', date_of_birth: '', gender: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '', relationship: 'parent', is_primary: true })
      router.refresh()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-studio-200 text-studio-700 hover:bg-studio-50">
        <UserPlus size={14} /> Add new dancer
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-studio-200 bg-studio-50/30 space-y-3">
      {error && <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="First name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required />
        <Input label="Last name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} required />
        <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} required />
        <Select label="Relationship" value={form.relationship} onChange={v => setForm({ ...form, relationship: v })}
          options={[{ value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Guardian' }, { value: 'grandparent', label: 'Grandparent' }, { value: 'self', label: 'Self' }, { value: 'other', label: 'Other' }]} />
        <Input label="Gender (optional)" value={form.gender} onChange={v => setForm({ ...form, gender: v })} />
        <Input label="Emergency contact name" value={form.emergency_contact_name} onChange={v => setForm({ ...form, emergency_contact_name: v })} />
        <Input label="Emergency contact phone" value={form.emergency_contact_phone} onChange={v => setForm({ ...form, emergency_contact_phone: v })} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Medical notes</label>
        <textarea value={form.medical_notes} onChange={e => setForm({ ...form, medical_notes: e.target.value })} rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
      </div>
      <Checkbox label="Primary contact for this dancer" checked={form.is_primary} onChange={v => setForm({ ...form, is_primary: v })} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
          {busy ? 'Creating...' : 'Add dancer'}
        </button>
      </div>
    </form>
  )
}

/* --------------------------------------------------------------------- */
/* Send email                                                            */
/* --------------------------------------------------------------------- */

function SendEmailPanel({ familyId, profile }: { familyId: string; profile: FamilyProfile }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', body: '', useSecondary: false })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'warn' | 'err'; msg: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setFeedback(null)
    try {
      const res = await fetch(`/api/families/${familyId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setFeedback({ kind: 'err', msg: json.error ?? 'Failed to send' })
      } else if (json.warning) {
        setFeedback({ kind: 'warn', msg: json.warning })
        setForm({ subject: '', body: '', useSecondary: false })
        router.refresh()
      } else {
        setFeedback({ kind: 'ok', msg: 'Email sent' })
        setForm({ subject: '', body: '', useSecondary: false })
        setOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      setFeedback({ kind: 'err', msg: err.message })
    } finally { setBusy(false) }
  }

  return (
    <Section title="Send email" subtitle={`To: ${form.useSecondary ? (profile.secondary_email ?? '—') : profile.email}`}>
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700">
          <Mail size={14} /> Compose email
        </button>
      ) : (
        <form onSubmit={submit} className="p-4 rounded-xl border border-studio-200 bg-studio-50/30 space-y-3">
          {feedback && (
            <div className={cn('p-2 rounded text-sm border',
              feedback.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-700' :
              feedback.kind === 'warn' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-red-50 border-red-200 text-red-700'
            )}>{feedback.msg}</div>
          )}
          <Input label="Subject" value={form.subject} onChange={v => setForm({ ...form, subject: v })} required />
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Message</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={6} required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500" />
            <p className="text-xs text-gray-500 mt-1">Plain text; line breaks are preserved as &lt;br&gt;.</p>
          </div>
          {profile.secondary_email && (
            <Checkbox label={`Send to secondary email (${profile.secondary_email}) instead`} checked={form.useSecondary} onChange={v => setForm({ ...form, useSecondary: v })} />
          )}
          {!profile.email_opt_in && (
            <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
              ⚠ This family has email opt-in turned off — sending will be blocked.
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setOpen(false); setFeedback(null) }} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={busy || !form.body.trim() || !form.subject.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
              <Send size={14} /> {busy ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}

/* --------------------------------------------------------------------- */
/* Enrollments by type                                                   */
/* --------------------------------------------------------------------- */

type EnrollmentType = 'all' | 'classes' | 'camps' | 'birthdays' | 'bookings' | 'appointments'

function EnrollmentsTab({
  classEnrollments, campRegistrations, parties, bookings, appointments,
}: {
  classEnrollments: ClassEnrollmentRow[]
  campRegistrations: CampRegistrationRow[]
  parties: PartyRow[]
  bookings: BookingRow[]
  appointments: FamilyAppointment[]
}) {
  const [filter, setFilter] = useState<EnrollmentType>('all')

  const counts = {
    all: classEnrollments.length + campRegistrations.length + parties.length + bookings.length + appointments.length,
    classes: classEnrollments.length,
    camps: campRegistrations.length,
    birthdays: parties.length,
    bookings: bookings.length,
    appointments: appointments.length,
  }

  const filters: Array<{ key: EnrollmentType; label: string; icon: React.ReactNode }> = [
    { key: 'all', label: 'All', icon: <BookOpen size={13} /> },
    { key: 'classes', label: 'Classes', icon: <Calendar size={13} /> },
    { key: 'camps', label: 'Camps', icon: <Tent size={13} /> },
    { key: 'birthdays', label: 'Birthdays', icon: <Cake size={13} /> },
    { key: 'bookings', label: 'Bookings', icon: <BookOpen size={13} /> },
    { key: 'appointments', label: 'Appointments', icon: <Clock size={13} /> },
  ]

  const showClasses = filter === 'all' || filter === 'classes'
  const showCamps = filter === 'all' || filter === 'camps'
  const showBirthdays = filter === 'all' || filter === 'birthdays'
  const showBookings = filter === 'all' || filter === 'bookings'
  const showAppointments = filter === 'all' || filter === 'appointments'

  return (
    <div className="space-y-5">
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

      {showClasses && (
        <Section title="Classes">
          {classEnrollments.length === 0 ? <p className="text-sm text-gray-400">No class enrollments.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Dancer</th><th className="pb-2">Class</th><th className="pb-2">Schedule</th>
                  <th className="pb-2">Tuition</th><th className="pb-2">Status</th><th className="pb-2">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classEnrollments.map(e => (
                  <tr key={e.id}>
                    <td className="py-2.5 text-gray-900">{e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'}</td>
                    <td className="py-2.5 text-gray-900">{e.class?.name ?? '—'}</td>
                    <td className="py-2.5 text-gray-500 capitalize">
                      {e.class ? `${e.class.day_of_week} ${formatTime(e.class.start_time)}` : '—'}
                    </td>
                    <td className="py-2.5 text-gray-700">{e.class ? formatCurrency(Number(e.class.monthly_tuition)) + '/mo' : '—'}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>{e.status}</span></td>
                    <td className="py-2.5 text-gray-500">{formatDate(e.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {showCamps && (
        <Section title="Camps">
          {campRegistrations.length === 0 ? <p className="text-sm text-gray-400">No camp registrations.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Dancer</th><th className="pb-2">Camp</th><th className="pb-2">Dates</th>
                  <th className="pb-2">Price</th><th className="pb-2">Status</th><th className="pb-2">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campRegistrations.map(r => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-gray-900">{r.student ? `${r.student.first_name} ${r.student.last_name}` : '—'}</td>
                    <td className="py-2.5 text-gray-900">{r.camp?.name ?? '—'}</td>
                    <td className="py-2.5 text-gray-500">{r.camp ? `${formatDate(r.camp.start_date)} – ${formatDate(r.camp.end_date)}` : '—'}</td>
                    <td className="py-2.5 text-gray-700">{r.camp ? formatCurrency(Number(r.camp.price)) : '—'}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(r.status))}>{r.status}</span></td>
                    <td className="py-2.5 text-gray-500">{r.paid_at ? formatDate(r.paid_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {showBirthdays && (
        <Section title="Birthday parties / events">
          {parties.length === 0 ? <p className="text-sm text-gray-400">No parties booked.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Date</th><th className="pb-2">Time</th><th className="pb-2">Package</th>
                  <th className="pb-2">Price</th><th className="pb-2">Status</th><th className="pb-2">Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parties.map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-gray-900">{formatDate(p.event_date)}</td>
                    <td className="py-2.5 text-gray-500">
                      {p.start_time && p.end_time ? `${p.start_time.slice(0,5)} – ${p.end_time.slice(0,5)}` : '—'}
                    </td>
                    <td className="py-2.5 text-gray-700">{p.package ?? '—'}</td>
                    <td className="py-2.5 text-gray-900 font-medium">{formatCurrency(Number(p.price))}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', getEnrollmentStatusColor(p.status))}>{p.status}</span></td>
                    <td className="py-2.5">
                      <span className={cn('text-xs px-2 py-1 rounded-full', p.deposit_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800')}>
                        {p.deposit_paid ? 'paid' : 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {showBookings && (
        <Section title="Studio bookings">
          {bookings.length === 0 ? <p className="text-sm text-gray-400">No bookings.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Title</th><th className="pb-2">Type</th><th className="pb-2">Date</th>
                  <th className="pb-2">Time</th><th className="pb-2">Price</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td className="py-2.5 text-gray-900">{b.title}</td>
                    <td className="py-2.5 text-gray-500 capitalize">{b.booking_type.replace('_', ' ')}</td>
                    <td className="py-2.5 text-gray-700">{formatDate(b.booking_date)}</td>
                    <td className="py-2.5 text-gray-500">
                      {b.start_time && b.end_time ? `${b.start_time.slice(0,5)} – ${b.end_time.slice(0,5)}` : '—'}
                    </td>
                    <td className="py-2.5 text-gray-900 font-medium">{formatCurrency(Number(b.price))}</td>
                    <td className="py-2.5"><span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', getEnrollmentStatusColor(b.status))}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {showAppointments && (
        <Section title="Appointments">
          {appointments.length === 0 ? <p className="text-sm text-gray-400">No appointments scheduled.</p> : (
            <div className="space-y-2">
              {appointments.map(a => {
                const date = new Date(a.scheduled_at)
                return (
                  <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {a.title || a.appointment_type.replace(/_/g, ' ')}
                        {a.student && <span className="text-gray-500 font-normal"> · {a.student.first_name} {a.student.last_name}</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        {a.duration_minutes ? ` · ${a.duration_minutes} min` : ''}
                        {a.location ? ` · ${a.location}` : ''}
                        {a.instructor ? ` · ${a.instructor.first_name} ${a.instructor.last_name}` : ''}
                      </p>
                      {a.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{a.notes}</p>}
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full', getEnrollmentStatusColor(a.status))}>{a.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* Shared atoms                                                          */
/* --------------------------------------------------------------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: 'red' | 'green' | 'gray' }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-semibold mt-1',
        accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : 'text-gray-900'
      )}>{value}</p>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <span className="text-gray-500 w-32">{label}</span>
      <span className="text-gray-900 flex-1">{value}</span>
    </div>
  )
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={cn(
      'text-xs px-2 py-1 rounded-full',
      on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    )}>{on ? '✓' : '×'} {label}</span>
  )
}

function Input({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
      />
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

function yearsSince(date: string): number {
  const d = new Date(date)
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--
  return Math.max(0, years)
}

function AdultDancerSection({ profile, linkedStudents }: { profile: FamilyProfile; linkedStudents: LinkedStudent[] }) {
  const router = useRouter()
  const selfLink = linkedStudents.find(ls => ls.relationship === 'self' && ls.student)
  const [opening, setOpening] = useState(false)
  const [dob, setDob] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function enroll() {
    if (!dob) { setError('Date of birth is required'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/families/${profile.id}/self-as-dancer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: dob }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to enroll')
      setOpening(false); setDob('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (selfLink && selfLink.student) {
    return (
      <Section title="Adult dancer" subtitle="This family member is also enrolled as a dancer">
        <div className="flex items-center justify-between p-3 rounded-lg bg-studio-50 border border-studio-100">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-studio-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selfLink.student.first_name} {selfLink.student.last_name}</p>
              <p className="text-xs text-gray-600">Self-enrolled · age {getAgeFromDob(selfLink.student.date_of_birth)}</p>
            </div>
          </div>
          <Link href={`/students/${selfLink.student.id}`} className="text-sm font-medium text-studio-600 hover:text-studio-700">
            Open dancer profile →
          </Link>
        </div>
      </Section>
    )
  }

  return (
    <Section title="Adult dancer" subtitle="Is this person also taking classes themselves?">
      {!opening ? (
        <button onClick={() => setOpening(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-studio-200 text-studio-700 hover:bg-studio-50">
          <UserPlus size={14} /> Register {profile.first_name} as an adult dancer
        </button>
      ) : (
        <div className="p-3 rounded-lg border border-studio-100 bg-studio-50/40 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <p className="text-sm text-gray-700">Creates a dancer record for <strong>{profile.first_name} {profile.last_name}</strong> linked to this account as <em>self</em>.</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input label="Date of birth" type="date" value={dob} onChange={setDob} required />
            </div>
            <button onClick={enroll} disabled={busy || !dob} className="px-3 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {busy ? 'Creating...' : 'Create dancer'}
            </button>
            <button onClick={() => { setOpening(false); setError('') }} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
    </Section>
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
