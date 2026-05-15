'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

interface Option { id: string; name: string }
interface GuardianOption { id: string; label: string }
interface StudentOption { id: string; first_name: string; last_name: string }

interface Props {
  party: any
  rooms: Option[]
  guardians: GuardianOption[]
  students: StudentOption[]
}

function initForm(p: any) {
  return {
    contact_name: p.contact_name ?? '',
    contact_email: p.contact_email ?? '',
    contact_phone: p.contact_phone ?? '',
    event_date: p.event_date ?? '',
    start_time: p.start_time?.slice(0, 5) ?? '',
    end_time: p.end_time?.slice(0, 5) ?? '',
    room_id: p.room_id ?? '',
    guest_count: p.guest_count != null ? String(p.guest_count) : '',
    package: p.package ?? '',
    price: p.price != null ? String(p.price) : '',
    status: p.status ?? 'inquiry',
    event_type: p.event_type ?? 'party',
    guardian_id: p.guardian_id ?? '',
    student_id: p.student_id ?? '',
    notes: p.notes ?? '',
  }
}

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function PartyOverviewTab({ party, rooms, guardians, students }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(() => initForm(party))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function set(key: keyof ReturnType<typeof initForm>, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  async function save() {
    if (!form.contact_name.trim() || !form.event_date || !form.start_time || !form.end_time) {
      setError('Contact name, date, and times are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        guest_count: form.guest_count === '' ? '' : Number(form.guest_count),
        price: Number(form.price) || 0,
      }
      const res = await fetch(`/api/parties/${party.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save event')
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="p-5 space-y-6">
        <Section title="Contact">
          <Field label="Contact Name" className="md:col-span-1">
            <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={field} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={field} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={field} />
          </Field>
        </Section>

        <Section title="Schedule">
          <Field label="Event Date">
            <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} className={field} />
          </Field>
          <Field label="Start Time">
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={field} />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={field} />
          </Field>
          <Field label="Room">
            <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className={field}>
              <option value="">None</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Guest Count">
            <input type="number" min="1" value={form.guest_count} onChange={e => set('guest_count', e.target.value)} className={field} />
          </Field>
        </Section>

        <Section title="Booking">
          <Field label="Event Type">
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className={field}>
              <option value="party">Party</option>
              <option value="recital">Recital</option>
              <option value="event">Studio Event</option>
            </select>
          </Field>
          <Field label="Package">
            <select value={form.package} onChange={e => set('package', e.target.value)} className={field}>
              <option value="">None</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="deluxe">Deluxe</option>
            </select>
          </Field>
          <Field label="Total Price ($)">
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className={field} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={field}>
              <option value="inquiry">Inquiry</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
        </Section>

        <Section title="Family Link">
          <Field label="Guardian (on file)">
            <select value={form.guardian_id} onChange={e => set('guardian_id', e.target.value)} className={field}>
              <option value="">Not linked</option>
              {guardians.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Student (e.g. birthday child)">
            <select value={form.student_id} onChange={e => set('student_id', e.target.value)} className={field}>
              <option value="">Not linked</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Notes">
          <Field label="Notes" className="md:col-span-3">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={field + ' resize-none'} placeholder="Theme, special requests, allergies…" />
          </Field>
        </Section>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
        {savedAt && !saving && <span className="text-sm text-green-600">Saved</span>}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
