'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2, Settings, Users, ClipboardCheck, MessageSquare, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import ClassSettingsTab from '@/components/admin/ClassSettingsTab'
import ClassRosterTab from '@/components/admin/ClassRosterTab'
import ClassAttendanceTab from '@/components/admin/ClassAttendanceTab'
import ClassCommsTab from '@/components/admin/ClassCommsTab'
import ClassFilesTab from '@/components/admin/ClassFilesTab'

interface Option { id: string; name: string }
interface InstructorOption { id: string; first_name: string; last_name: string }
interface StudentOption { id: string; first_name: string; last_name: string; date_of_birth: string }

export interface Enrollment {
  id: string
  status: string
  enrolled_at: string
  student: StudentOption | null
}

export interface ClassSession {
  id: string
  session_date: string
  notes: string | null
  attendance: { student_id: string; present: boolean }[]
}

export interface ClassComm {
  id: string
  subject: string | null
  body: string
  comm_type: string
  sent_at: string | null
  created_at: string
}

export interface ClassFile {
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
  cls: any
  enrollments: Enrollment[]
  instructors: InstructorOption[]
  rooms: Option[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: Option[]
  students: StudentOption[]
  sessions: ClassSession[]
  communications: ClassComm[]
  files: ClassFile[]
}

type Tab = 'settings' | 'roster' | 'attendance' | 'communication' | 'files'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  { key: 'roster', label: 'Roster', icon: <Users size={15} /> },
  { key: 'attendance', label: 'Attendance', icon: <ClipboardCheck size={15} /> },
  { key: 'communication', label: 'Communication', icon: <MessageSquare size={15} /> },
  { key: 'files', label: 'Files', icon: <FolderOpen size={15} /> },
]

export default function ClassDetail({
  cls, enrollments, instructors, rooms, classTypes, seasons, students, sessions, communications, files,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('settings')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggleArchive() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !cls.active }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to update class')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Permanently delete this class? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classes/${cls.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete class')
      }
      router.push('/classes')
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
          {!cls.active && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
          )}
          {!cls.visible && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Hidden</span>
          )}
          {!cls.registration_open && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Registration closed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleArchive}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cls.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
            {cls.active ? 'Archive' : 'Restore'}
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
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-studio-600 text-studio-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.icon}
            {t.label}
            {t.key === 'roster' && (
              <span className="text-xs text-gray-400">({enrollments.filter(e => e.status === 'active').length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <ClassSettingsTab cls={cls} instructors={instructors} rooms={rooms} classTypes={classTypes} seasons={seasons} />
      )}
      {tab === 'roster' && (
        <ClassRosterTab classId={cls.id} enrollments={enrollments} students={students} />
      )}
      {tab === 'attendance' && (
        <ClassAttendanceTab classId={cls.id} enrollments={enrollments} sessions={sessions} />
      )}
      {tab === 'communication' && (
        <ClassCommsTab classId={cls.id} communications={communications} />
      )}
      {tab === 'files' && (
        <ClassFilesTab classId={cls.id} files={files} />
      )}
    </div>
  )
}
