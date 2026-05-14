'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive, ArchiveRestore, Trash2, Settings, Users, ClipboardCheck,
  CalendarClock, MessageSquare, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CampOverviewTab from '@/components/admin/CampOverviewTab'
import CampRegistrationsTab from '@/components/admin/CampRegistrationsTab'
import CampAttendanceTab from '@/components/admin/CampAttendanceTab'
import CampItineraryTab from '@/components/admin/CampItineraryTab'
import CampCommsTab from '@/components/admin/CampCommsTab'
import CampFilesTab from '@/components/admin/CampFilesTab'

interface Option { id: string; name: string }
interface InstructorOption { id: string; first_name: string; last_name: string }
export interface StudentOption {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
}

export interface CampRegistration {
  id: string
  status: string
  payment_status: string
  amount_paid: number
  waitlist_position: number | null
  notes: string | null
  archived: boolean
  registered_at: string
  student: StudentOption | null
}

export interface CampAttendanceRec {
  student_id: string
  attend_date: string
  present: boolean
}

export interface CampItineraryItem {
  id: string
  day_date: string
  start_time: string | null
  end_time: string | null
  title: string
  location: string | null
  notes: string | null
  sort_order: number
}

export interface CampFile {
  id: string
  name: string
  category: string
  storage_path: string
  size_bytes: number | null
  mime_type: string | null
  created_at: string
  url: string | null
}

interface Props {
  camp: any
  registrations: CampRegistration[]
  attendance: CampAttendanceRec[]
  itinerary: CampItineraryItem[]
  files: CampFile[]
  instructors: InstructorOption[]
  rooms: Option[]
  students: StudentOption[]
}

type Tab = 'overview' | 'registrations' | 'attendance' | 'itinerary' | 'communication' | 'files'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Settings size={15} /> },
  { key: 'registrations', label: 'Registrations', icon: <Users size={15} /> },
  { key: 'attendance', label: 'Attendance', icon: <ClipboardCheck size={15} /> },
  { key: 'itinerary', label: 'Itinerary', icon: <CalendarClock size={15} /> },
  { key: 'communication', label: 'Communication', icon: <MessageSquare size={15} /> },
  { key: 'files', label: 'Files', icon: <FolderOpen size={15} /> },
]

export default function CampDetail({
  camp, registrations, attendance, itinerary, files, instructors, rooms, students,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const registeredCount = registrations.filter(r => r.status === 'registered').length

  async function toggleArchive() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${camp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !camp.active }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to update camp')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Permanently delete this camp? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/camps/${camp.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete camp')
      }
      router.push('/camps')
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {!camp.active && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
          )}
          {!camp.registration_open && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Registration closed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleArchive}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {camp.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
            {camp.active ? 'Archive' : 'Restore'}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.key
                ? 'border-studio-600 text-studio-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.icon}
            {t.label}
            {t.key === 'registrations' && (
              <span className="text-xs text-gray-400">({registeredCount})</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <CampOverviewTab camp={camp} instructors={instructors} rooms={rooms} />
      )}
      {tab === 'registrations' && (
        <CampRegistrationsTab
          campId={camp.id}
          maxCapacity={camp.max_capacity}
          price={Number(camp.price)}
          registrations={registrations}
          students={students}
        />
      )}
      {tab === 'attendance' && (
        <CampAttendanceTab
          campId={camp.id}
          startDate={camp.start_date}
          endDate={camp.end_date}
          registrations={registrations}
          attendance={attendance}
        />
      )}
      {tab === 'itinerary' && (
        <CampItineraryTab
          campId={camp.id}
          startDate={camp.start_date}
          endDate={camp.end_date}
          itinerary={itinerary}
        />
      )}
      {tab === 'communication' && <CampCommsTab campId={camp.id} />}
      {tab === 'files' && <CampFilesTab campId={camp.id} files={files} />}
    </div>
  )
}
