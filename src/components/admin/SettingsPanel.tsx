'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import RowActions from '@/components/admin/RowActions'
import StudioProfileForm from '@/components/admin/StudioProfileForm'
import SettingsToggleGroup, { type ToggleSection } from '@/components/admin/SettingsToggleGroup'
import TaxRatesManager from '@/components/admin/TaxRatesManager'
import ChargeCategoriesManager from '@/components/admin/ChargeCategoriesManager'
import AccountProfileForm from '@/components/admin/AccountProfileForm'
import {
  SeasonFormModal, RoomFormModal, ClassTypeFormModal,
} from '@/components/forms/SettingsEntityModals'
import { useRouter } from 'next/navigation'

interface Season {
  id: string; name: string; start_date: string; end_date: string
  registration_opens: string | null; active: boolean; tuition_due_day: number
}
interface Room {
  id: string; name: string; capacity: number | null
  floor_type: string | null; has_mirrors: boolean; has_barres: boolean; active: boolean
}
interface ClassType {
  id: string; name: string; style: string; level: string
  min_age: number | null; max_age: number | null
  description: string | null; color: string; active: boolean
}
interface StudioHour {
  day_of_week: string; is_open: boolean; open_time: string; close_time: string
}
interface TaxRate { id: string; name: string; rate: number; region: string | null; active: boolean }
interface ChargeCategory { id: string; name: string; description: string | null; active: boolean }

interface Props {
  seasons: Season[]
  rooms: Room[]
  classTypes: ClassType[]
  studioHours: StudioHour[]
  settings: Record<string, any>
  taxRates: TaxRate[]
  chargeCategories: ChargeCategory[]
}

type Tab = 'Account' | 'Studio' | 'Parent Portal' | 'Staff Portal' | 'Finance' | 'Hours' | 'Seasons' | 'Rooms' | 'Class Types'
const TABS: Tab[] = ['Account', 'Studio', 'Parent Portal', 'Staff Portal', 'Finance', 'Hours', 'Seasons', 'Rooms', 'Class Types']
type SortDir = 'asc' | 'desc'
type SeasonSortKey = 'name' | 'start_date' | 'end_date' | 'active'
type RoomSortKey = 'name' | 'capacity' | 'active'
type ClassTypeSortKey = 'name' | 'style' | 'level' | 'active'

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const fieldClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

/* ---- Portal preference definitions ---- */

const PARENT_PORTAL_SECTIONS: ToggleSection[] = [
  {
    title: 'General',
    toggles: [
      { key: 'allow_account_creation', label: 'Allow visitors to create new accounts online' },
      { key: 'show_classes', label: 'Show classes and allow visitors to register' },
      { key: 'show_camps', label: 'Show camps and allow visitors to register' },
      { key: 'show_parties', label: 'Show parties and allow visitors to register' },
      { key: 'show_tuition', label: 'Show tuition amounts' },
      { key: 'show_instructors', label: 'Show class / camp instructors' },
      { key: 'show_class_descriptions', label: 'Show full class descriptions if not logged in' },
      { key: 'show_student_images', label: 'Show student images in the customer portal' },
      { key: 'hide_medical_info', label: 'Hide student medical information' },
      { key: 'show_attendance', label: 'Show attendance in the customer portal' },
      { key: 'allow_absence_requests', label: 'Allow future absence requests' },
    ],
  },
  {
    title: 'Class Registration',
    toggles: [
      { key: 'allow_request_full', label: 'Allow visitors to request a class that is full' },
      { key: 'allow_waitlist', label: 'Allow waitlist enrollment when a class is full' },
      { key: 'allow_trial', label: 'Allow trial enrollment requests' },
      { key: 'allow_transfer', label: 'Allow transfer requests' },
      { key: 'allow_drop', label: 'Allow drop requests' },
      { key: 'auto_approve', label: 'Auto-approve enrollment requests (live enrollments)' },
      { key: 'auto_charge_first_tuition', label: 'Auto-charge the first tuition on enrollment' },
    ],
  },
  {
    title: 'Camp Registration',
    toggles: [
      { key: 'camp_count_against_openings', label: 'Count camp requests against openings' },
      { key: 'camp_allow_full', label: 'Allow visitors to request a camp that is full' },
      { key: 'camp_email_notification', label: 'Email the studio on camp enrollment requests' },
      { key: 'camp_restrict_start_date', label: 'Restrict enrollment start date to the camp start date' },
    ],
  },
  {
    title: 'Class Filters',
    toggles: [
      { key: 'filter_age', label: 'Show age filter' },
      { key: 'filter_gender', label: 'Show gender filter' },
      { key: 'filter_program', label: 'Show program filter' },
      { key: 'filter_session', label: 'Show session filter' },
      { key: 'filter_day', label: 'Show day filter' },
      { key: 'filter_level', label: 'Show level filter' },
      { key: 'filter_instructor', label: 'Show instructor filter' },
      { key: 'filter_openings', label: 'Show openings filter' },
      { key: 'filter_search', label: 'Show search box' },
    ],
  },
]

const PARENT_PORTAL_DEFAULTS: Record<string, boolean> = {
  allow_account_creation: true, show_classes: true, show_camps: true, show_parties: true,
  show_tuition: true, show_instructors: true, show_class_descriptions: true,
  show_student_images: true, hide_medical_info: true, show_attendance: true, allow_absence_requests: true,
  allow_request_full: true, allow_waitlist: true, allow_trial: true, allow_transfer: true,
  allow_drop: true, auto_approve: false, auto_charge_first_tuition: false,
  camp_count_against_openings: true, camp_allow_full: true, camp_email_notification: true,
  camp_restrict_start_date: false,
  filter_age: true, filter_gender: true, filter_program: true, filter_session: true,
  filter_day: true, filter_level: true, filter_instructor: true, filter_openings: true, filter_search: true,
}

const STAFF_PORTAL_SECTIONS: ToggleSection[] = [
  {
    title: 'General',
    toggles: [
      { key: 'enable_staff_portal', label: 'Enable the staff portal' },
      { key: 'enable_student_images', label: 'Enable student images in the staff portal' },
      { key: 'sort_by_first_name', label: 'Sort attendance and evaluations by student first name' },
      { key: 'show_instructor_name', label: 'Show instructor name on schedule listings' },
      { key: 'show_zone', label: 'Show zone below class / camp name' },
      { key: 'show_outstanding_balance', label: 'Show outstanding balance on roster' },
      { key: 'enable_checkin_mode', label: 'Enable attendance check-in mode' },
      { key: 'show_time_clock', label: 'Show time clock in the staff portal' },
      { key: 'enable_clock_in_out', label: 'Enable clock-in / clock-out' },
      { key: 'require_geolocation', label: 'Require geolocation for clock-in / clock-out' },
    ],
  },
]

const STAFF_PORTAL_DEFAULTS: Record<string, boolean> = {
  enable_staff_portal: true, enable_student_images: true, sort_by_first_name: true,
  show_instructor_name: true, show_zone: true, show_outstanding_balance: true,
  enable_checkin_mode: true, show_time_clock: true, enable_clock_in_out: true, require_geolocation: false,
}

const FINANCE_SECTIONS: ToggleSection[] = [
  {
    title: 'Financial Options',
    toggles: [
      { key: 'require_saved_payment', label: 'Require a saved payment method for recurring billing' },
      { key: 'show_full_ledger', label: 'Show full ledger history, not just the last 30 days' },
      { key: 'allow_statements', label: 'Allow visitors to generate a statement or ledger report' },
      { key: 'show_account_credit', label: 'Show the account credit in the ledger' },
      { key: 'allow_account_credits', label: 'Allow visitors to use available account credits' },
      { key: 'allow_partial_payments', label: 'Allow partial payments' },
      { key: 'allow_promo_codes', label: 'Allow promo codes' },
      { key: 'require_past_due_first', label: 'Require past-due charges to be paid in full first' },
    ],
  },
]

const FINANCE_DEFAULTS: Record<string, boolean> = {
  require_saved_payment: true, show_full_ledger: true, allow_statements: true,
  show_account_credit: false, allow_account_credits: true, allow_partial_payments: true,
  allow_promo_codes: true, require_past_due_first: true,
}

export default function SettingsPanel({ seasons, rooms, classTypes, studioHours, settings, taxRates, chargeCategories }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Account')

  // Modal state for the three managed entities
  const [seasonModal, setSeasonModal] = useState<{ mode: 'create' | 'edit'; row?: Season } | null>(null)
  const [roomModal, setRoomModal] = useState<{ mode: 'create' | 'edit'; row?: Room } | null>(null)
  const [classTypeModal, setClassTypeModal] = useState<{ mode: 'create' | 'edit'; row?: ClassType } | null>(null)

  // Sort state per entity
  const [seasonSort, setSeasonSort] = useState<{ key: SeasonSortKey; dir: SortDir }>({ key: 'start_date', dir: 'desc' })
  const [roomSort, setRoomSort] = useState<{ key: RoomSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })
  const [classTypeSort, setClassTypeSort] = useState<{ key: ClassTypeSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })

  function cmp(a: any, b: any, dir: SortDir) {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    if (typeof a === 'number' && typeof b === 'number') return dir === 'asc' ? a - b : b - a
    if (typeof a === 'boolean') return dir === 'asc' ? Number(b) - Number(a) : Number(a) - Number(b)
    return dir === 'asc' ? String(a).localeCompare(String(b)) : String(b).localeCompare(String(a))
  }

  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => cmp((a as any)[seasonSort.key], (b as any)[seasonSort.key], seasonSort.dir)), [seasons, seasonSort])
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => cmp((a as any)[roomSort.key], (b as any)[roomSort.key], roomSort.dir)), [rooms, roomSort])
  const sortedClassTypes = useMemo(() => [...classTypes].sort((a, b) => cmp((a as any)[classTypeSort.key], (b as any)[classTypeSort.key], classTypeSort.dir)), [classTypes, classTypeSort])

  function SortHeader<K extends string>({ col, label, sort, setSort }: {
    col: K; label: string; sort: { key: K; dir: SortDir }; setSort: (s: { key: K; dir: SortDir }) => void
  }) {
    const active = sort.key === col
    const Icon = active && sort.dir === 'desc' ? ChevronDown : ChevronUp
    return (
      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
        <button type="button"
          onClick={() => setSort({ key: col, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
          className="inline-flex items-center gap-1 hover:text-gray-700">
          {label}
          <Icon size={12} className={active ? 'text-gray-700' : 'text-gray-300'} />
        </button>
      </th>
    )
  }

  async function deleteEntity(endpoint: string, entityLabel: string) {
    if (!confirm(`Delete this ${entityLabel}? This cannot be undone.`)) return
    const res = await fetch(endpoint, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Delete failed: ${data.error ?? res.statusText}`)
      return
    }
    router.refresh()
  }
  const [hours, setHours] = useState<StudioHour[]>(() =>
    [...studioHours].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)),
  )
  const [savingHours, setSavingHours] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)
  const [hoursError, setHoursError] = useState('')

  function setHour(day: string, patch: Partial<StudioHour>) {
    setHours(hs => hs.map(h => (h.day_of_week === day ? { ...h, ...patch } : h)))
    setHoursSaved(false)
  }

  async function saveHours() {
    setSavingHours(true)
    setHoursError('')
    try {
      const res = await fetch('/api/studio-hours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save hours')
      }
      setHoursSaved(true)
    } catch (err: any) {
      setHoursError(err.message)
    } finally {
      setSavingHours(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Account' && <AccountProfileForm />}

      {activeTab === 'Studio' && <StudioProfileForm initial={settings.studio_profile ?? null} />}

      {activeTab === 'Parent Portal' && (
        <SettingsToggleGroup
          settingsKey="parent_portal"
          title="Parent / Customer Portal"
          subtitle="Controls what families see and can do in the customer portal"
          sections={PARENT_PORTAL_SECTIONS}
          defaults={PARENT_PORTAL_DEFAULTS}
          initial={settings.parent_portal ?? null}
        />
      )}

      {activeTab === 'Staff Portal' && (
        <SettingsToggleGroup
          settingsKey="staff_portal"
          title="Staff / Instructor Portal"
          subtitle="Controls instructor portal features and time-clock behavior"
          sections={STAFF_PORTAL_SECTIONS}
          defaults={STAFF_PORTAL_DEFAULTS}
          initial={settings.staff_portal ?? null}
        />
      )}

      {activeTab === 'Finance' && (
        <div className="space-y-6">
          <SettingsToggleGroup
            settingsKey="finance"
            title="Financial Settings"
            subtitle="Billing and payment behavior across the studio and customer portal"
            sections={FINANCE_SECTIONS}
            defaults={FINANCE_DEFAULTS}
            initial={settings.finance ?? null}
          />
          <TaxRatesManager taxRates={taxRates} />
          <ChargeCategoriesManager categories={chargeCategories} />
        </div>
      )}

      {activeTab === 'Hours' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Studio Hours</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sets the time range shown on the calendar</p>
          </div>
          <div className="p-5 space-y-2">
            {hours.map(h => (
              <div key={h.day_of_week} className="flex items-center gap-3 py-1.5">
                <span className="w-28 text-sm font-medium text-gray-700 capitalize">{h.day_of_week}</span>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 w-24">
                  <input
                    type="checkbox"
                    checked={h.is_open}
                    onChange={e => setHour(h.day_of_week, { is_open: e.target.checked })}
                    className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
                  />
                  {h.is_open ? 'Open' : 'Closed'}
                </label>
                <input
                  type="time"
                  value={h.open_time?.slice(0, 5) ?? ''}
                  disabled={!h.is_open}
                  onChange={e => setHour(h.day_of_week, { open_time: e.target.value })}
                  className={fieldClass + ' max-w-32 disabled:opacity-40'}
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  value={h.close_time?.slice(0, 5) ?? ''}
                  disabled={!h.is_open}
                  onChange={e => setHour(h.day_of_week, { close_time: e.target.value })}
                  className={fieldClass + ' max-w-32 disabled:opacity-40'}
                />
              </div>
            ))}
            {hoursError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{hoursError}</div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            {hoursSaved && !savingHours && <span className="text-sm text-green-600">Saved</span>}
            <button
              onClick={saveHours}
              disabled={savingHours}
              className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
            >
              {savingHours ? 'Saving…' : 'Save Hours'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Seasons' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Seasons</h2>
              <p className="text-sm text-gray-500 mt-0.5">Registration and billing periods</p>
            </div>
            <button onClick={() => setSeasonModal({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
              <Plus size={14} /> Add season
            </button>
          </div>
          {sortedSeasons.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No seasons configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader col="name" label="Name" sort={seasonSort} setSort={setSeasonSort} />
                  <SortHeader col="start_date" label="Start" sort={seasonSort} setSort={setSeasonSort} />
                  <SortHeader col="end_date" label="End" sort={seasonSort} setSort={setSeasonSort} />
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tuition Due</th>
                  <SortHeader col="active" label="Status" sort={seasonSort} setSort={setSeasonSort} />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedSeasons.map(s => (
                  <tr key={s.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(s.start_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(s.end_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">Day {s.tuition_due_day}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSeasonModal({ mode: 'edit', row: s })}
                          className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button onClick={() => deleteEntity(`/api/seasons/${s.id}`, 'season')}
                          className="p-1.5 rounded hover:bg-red-50" title="Delete">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Rooms' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Rooms & Spaces</h2>
              <p className="text-sm text-gray-500 mt-0.5">Studio rooms available for scheduling</p>
            </div>
            <button onClick={() => setRoomModal({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
              <Plus size={14} /> Add room
            </button>
          </div>
          {sortedRooms.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No rooms configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader col="name" label="Room" sort={roomSort} setSort={setRoomSort} />
                  <SortHeader col="capacity" label="Capacity" sort={roomSort} setSort={setRoomSort} />
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Floor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Features</th>
                  <SortHeader col="active" label="Status" sort={roomSort} setSort={setRoomSort} />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRooms.map(r => (
                  <tr key={r.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.capacity ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{r.floor_type ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        {r.has_mirrors && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Mirrors</span>}
                        {r.has_barres && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Barres</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setRoomModal({ mode: 'edit', row: r })}
                          className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button onClick={() => deleteEntity(`/api/rooms/${r.id}`, 'room')}
                          className="p-1.5 rounded hover:bg-red-50" title="Delete">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Class Types' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Class Types</h2>
              <p className="text-sm text-gray-500 mt-0.5">Dance styles and class catalog</p>
            </div>
            <button onClick={() => setClassTypeModal({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
              <Plus size={14} /> Add class type
            </button>
          </div>
          {sortedClassTypes.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No class types configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader col="name" label="Name" sort={classTypeSort} setSort={setClassTypeSort} />
                  <SortHeader col="style" label="Style" sort={classTypeSort} setSort={setClassTypeSort} />
                  <SortHeader col="level" label="Level" sort={classTypeSort} setSort={setClassTypeSort} />
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Age Range</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Color</th>
                  <SortHeader col="active" label="Status" sort={classTypeSort} setSort={setClassTypeSort} />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedClassTypes.map(ct => (
                  <tr key={ct.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{ct.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{ct.style}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{ct.level.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {ct.min_age && ct.max_age ? `${ct.min_age}–${ct.max_age} yrs` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: ct.color }} />
                        <span className="text-xs text-gray-500 font-mono">{ct.color}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        ct.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {ct.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setClassTypeModal({ mode: 'edit', row: ct })}
                          className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button onClick={() => deleteEntity(`/api/class-types/${ct.id}`, 'class type')}
                          className="p-1.5 rounded hover:bg-red-50" title="Delete">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {seasonModal && (
        <SeasonFormModal mode={seasonModal.mode} season={seasonModal.row} onClose={() => setSeasonModal(null)} />
      )}
      {roomModal && (
        <RoomFormModal mode={roomModal.mode} room={roomModal.row} onClose={() => setRoomModal(null)} />
      )}
      {classTypeModal && (
        <ClassTypeFormModal mode={classTypeModal.mode} classType={classTypeModal.row} onClose={() => setClassTypeModal(null)} />
      )}
    </div>
  )
}
