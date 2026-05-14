'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

interface Option { id: string; name: string }
interface InstructorOption { id: string; first_name: string; last_name: string }

interface Props {
  camp: any
  instructors: InstructorOption[]
  rooms: Option[]
}

function initForm(camp: any) {
  return {
    name: camp.name ?? '',
    description: camp.description ?? '',
    start_date: camp.start_date ?? '',
    end_date: camp.end_date ?? '',
    start_time: camp.start_time?.slice(0, 5) ?? '',
    end_time: camp.end_time?.slice(0, 5) ?? '',
    instructor_id: camp.instructor_id ?? '',
    room_id: camp.room_id ?? '',
    max_capacity: String(camp.max_capacity ?? 20),
    price: camp.price != null ? String(camp.price) : '',
    deposit_amount: camp.deposit_amount != null ? String(camp.deposit_amount) : '',
    age_min: camp.age_min != null ? String(camp.age_min) : '',
    age_max: camp.age_max != null ? String(camp.age_max) : '',
    registration_open: camp.registration_open ?? true,
    what_to_bring: camp.what_to_bring ?? '',
    parent_notes: camp.parent_notes ?? '',
    active: camp.active ?? true,
  }
}

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function CampOverviewTab({ camp, instructors, rooms }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(() => initForm(camp))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function set(key: keyof ReturnType<typeof initForm>, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  async function save() {
    if (!form.name.trim() || !form.start_date || !form.end_date || form.price === '') {
      setError('Name, dates, and price are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        max_capacity: Number(form.max_capacity) || 0,
        price: Number(form.price) || 0,
        deposit_amount: form.deposit_amount === '' ? '' : Number(form.deposit_amount),
        age_min: form.age_min === '' ? '' : Number(form.age_min),
        age_max: form.age_max === '' ? '' : Number(form.age_max),
      }
      const res = await fetch(`/api/camps/${camp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save camp')
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
        <Section title="Basics">
          <Field label="Camp Name" className="md:col-span-2">
            <input value={form.name} onChange={e => set('name', e.target.value)} className={field} />
          </Field>
          <Field label="Description" className="md:col-span-3">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={field + ' resize-none'} />
          </Field>
        </Section>

        <Section title="Schedule & Placement">
          <Field label="Start Date">
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={field} />
          </Field>
          <Field label="End Date">
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={field} />
          </Field>
          <div />
          <Field label="Daily Start Time">
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={field} />
          </Field>
          <Field label="Daily End Time">
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={field} />
          </Field>
          <div />
          <Field label="Instructor">
            <select value={form.instructor_id} onChange={e => set('instructor_id', e.target.value)} className={field}>
              <option value="">None</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
            </select>
          </Field>
          <Field label="Room">
            <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className={field}>
              <option value="">None</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Capacity & Pricing">
          <Field label="Max Capacity">
            <input type="number" min="1" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} className={field} />
          </Field>
          <Field label="Price ($)">
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className={field} />
          </Field>
          <Field label="Deposit ($)">
            <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} className={field} placeholder="Optional" />
          </Field>
          <Field label="Min Age">
            <input type="number" min="0" value={form.age_min} onChange={e => set('age_min', e.target.value)} className={field} />
          </Field>
          <Field label="Max Age">
            <input type="number" min="0" value={form.age_max} onChange={e => set('age_max', e.target.value)} className={field} />
          </Field>
        </Section>

        <Section title="Registration & Family Info">
          <Toggle label="Registration open" hint="Families can register while open" checked={form.registration_open} onChange={v => set('registration_open', v)} />
          <Field label="What to Bring" className="md:col-span-3">
            <textarea value={form.what_to_bring} onChange={e => set('what_to_bring', e.target.value)} rows={3} className={field + ' resize-none'} placeholder="Water bottle, dance shoes, lunch…" />
          </Field>
          <Field label="Notes for Parents" className="md:col-span-3">
            <textarea value={form.parent_notes} onChange={e => set('parent_notes', e.target.value)} rows={3} className={field + ' resize-none'} placeholder="Drop-off / pick-up details, policies…" />
          </Field>
        </Section>

        <Section title="Visibility">
          <Toggle label="Active" hint="Inactive camps are archived" checked={form.active} onChange={v => set('active', v)} />
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

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
      />
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  )
}
