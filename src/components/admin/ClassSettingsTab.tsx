'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

interface Option { id: string; name: string }
interface InstructorOption { id: string; first_name: string; last_name: string }

interface Props {
  cls: any
  instructors: InstructorOption[]
  rooms: Option[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: Option[]
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function initForm(cls: any) {
  return {
    name: cls.name ?? '',
    description: cls.description ?? '',
    class_type_id: cls.class_type_id ?? '',
    season_id: cls.season_id ?? '',
    instructor_id: cls.instructor_id ?? '',
    room_id: cls.room_id ?? '',
    day_of_week: cls.day_of_week ?? 'monday',
    start_time: cls.start_time?.slice(0, 5) ?? '',
    end_time: cls.end_time?.slice(0, 5) ?? '',
    start_date: cls.start_date ?? '',
    end_date: cls.end_date ?? '',
    registration_start: cls.registration_start ?? '',
    registration_end: cls.registration_end ?? '',
    max_students: String(cls.max_students ?? 15),
    billing_type: cls.billing_type ?? 'monthly',
    monthly_tuition: String(cls.monthly_tuition ?? 0),
    flat_amount: cls.flat_amount != null ? String(cls.flat_amount) : '',
    registration_fee: String(cls.registration_fee ?? 0),
    allow_discounts: cls.allow_discounts ?? true,
    age_min: cls.age_min != null ? String(cls.age_min) : '',
    age_max: cls.age_max != null ? String(cls.age_max) : '',
    gender: cls.gender ?? 'any',
    visible: cls.visible ?? true,
    active: cls.active ?? true,
    registration_open: cls.registration_open ?? true,
    internal_registration_only: cls.internal_registration_only ?? false,
    notes: cls.notes ?? '',
  }
}

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function ClassSettingsTab({ cls, instructors, rooms, classTypes, seasons }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(() => initForm(cls))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function set(key: keyof ReturnType<typeof initForm>, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        max_students: Number(form.max_students) || 0,
        monthly_tuition: Number(form.monthly_tuition) || 0,
        registration_fee: Number(form.registration_fee) || 0,
        flat_amount: form.flat_amount === '' ? '' : Number(form.flat_amount),
        age_min: form.age_min === '' ? '' : Number(form.age_min),
        age_max: form.age_max === '' ? '' : Number(form.age_max),
      }
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save class')
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
          <Field label="Class Name" className="md:col-span-2">
            <input value={form.name} onChange={e => set('name', e.target.value)} className={field} />
          </Field>
          <Field label="Class Type">
            <select value={form.class_type_id} onChange={e => set('class_type_id', e.target.value)} className={field}>
              <option value="">Select…</option>
              {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </Field>
          <Field label="Description" className="md:col-span-3">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={field + ' resize-none'} />
          </Field>
        </Section>

        <Section title="Schedule & Placement">
          <Field label="Season">
            <select value={form.season_id} onChange={e => set('season_id', e.target.value)} className={field}>
              <option value="">Standalone (no season)</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
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
          <Field label="Day of Week">
            <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} className={field}>
              {DAYS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Start Time">
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={field} />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={field} />
          </Field>
          <Field label="Class Start Date">
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={field} />
          </Field>
          <Field label="Class End Date">
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={field} />
          </Field>
        </Section>

        <Section title="Registration & Eligibility">
          <Field label="Registration Opens">
            <input type="date" value={form.registration_start} onChange={e => set('registration_start', e.target.value)} className={field} />
          </Field>
          <Field label="Registration Closes">
            <input type="date" value={form.registration_end} onChange={e => set('registration_end', e.target.value)} className={field} />
          </Field>
          <Field label="Max Students">
            <input type="number" min="1" value={form.max_students} onChange={e => set('max_students', e.target.value)} className={field} />
          </Field>
          <Field label="Min Age">
            <input type="number" min="0" value={form.age_min} onChange={e => set('age_min', e.target.value)} className={field} />
          </Field>
          <Field label="Max Age">
            <input type="number" min="0" value={form.age_max} onChange={e => set('age_max', e.target.value)} className={field} />
          </Field>
          <Field label="Gender Eligibility">
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className={field}>
              <option value="any">Any</option>
              <option value="female">Female only</option>
              <option value="male">Male only</option>
              <option value="non-binary">Non-binary only</option>
            </select>
          </Field>
          <Toggle label="Registration open" checked={form.registration_open} onChange={v => set('registration_open', v)} />
          <Toggle label="Internal registration only" hint="Staff can enroll; public cannot" checked={form.internal_registration_only} onChange={v => set('internal_registration_only', v)} />
        </Section>

        <Section title="Billing">
          <Field label="Billing Type">
            <select value={form.billing_type} onChange={e => set('billing_type', e.target.value)} className={field}>
              <option value="monthly">Monthly tuition</option>
              <option value="flat">Flat rate</option>
            </select>
          </Field>
          {form.billing_type === 'monthly' ? (
            <Field label="Monthly Tuition ($)">
              <input type="number" min="0" step="0.01" value={form.monthly_tuition} onChange={e => set('monthly_tuition', e.target.value)} className={field} />
            </Field>
          ) : (
            <Field label="Flat Amount ($)">
              <input type="number" min="0" step="0.01" value={form.flat_amount} onChange={e => set('flat_amount', e.target.value)} className={field} />
            </Field>
          )}
          <Field label="Registration Fee ($)">
            <input type="number" min="0" step="0.01" value={form.registration_fee} onChange={e => set('registration_fee', e.target.value)} className={field} />
          </Field>
          <Toggle label="Allow discounts" checked={form.allow_discounts} onChange={v => set('allow_discounts', v)} />
        </Section>

        <Section title="Visibility">
          <Toggle label="Active" hint="Inactive classes are archived" checked={form.active} onChange={v => set('active', v)} />
          <Toggle label="Visible" hint="Hidden classes don't show on public listings" checked={form.visible} onChange={v => set('visible', v)} />
        </Section>

        <Section title="Internal Notes">
          <Field label="Notes" className="md:col-span-3">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={field + ' resize-none'} placeholder="Staff-only notes about this class…" />
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
