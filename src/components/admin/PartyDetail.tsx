'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trash2, Settings, DollarSign, ListChecks, FolderOpen, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PartyOverviewTab from '@/components/admin/PartyOverviewTab'
import PartyPaymentsTab from '@/components/admin/PartyPaymentsTab'
import PartyChecklistTab from '@/components/admin/PartyChecklistTab'
import PartyFilesTab from '@/components/admin/PartyFilesTab'
import PartyCommsTab from '@/components/admin/PartyCommsTab'

interface Option { id: string; name: string }
interface GuardianOption { id: string; label: string }
interface StudentOption { id: string; first_name: string; last_name: string }

export interface PartyTask {
  id: string
  title: string
  done: boolean
  sort_order: number
}

export interface PartyFile {
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
  party: any
  tasks: PartyTask[]
  files: PartyFile[]
  rooms: Option[]
  guardians: GuardianOption[]
  students: StudentOption[]
}

type Tab = 'overview' | 'payments' | 'checklist' | 'files' | 'communication'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Settings size={15} /> },
  { key: 'payments', label: 'Payments', icon: <DollarSign size={15} /> },
  { key: 'checklist', label: 'Checklist', icon: <ListChecks size={15} /> },
  { key: 'files', label: 'Files', icon: <FolderOpen size={15} /> },
  { key: 'communication', label: 'Communication', icon: <Mail size={15} /> },
]

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function PartyDetail({ party, tasks, files, rooms, guardians, students }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openTasks = tasks.filter(t => !t.done).length

  async function remove() {
    if (!confirm('Permanently delete this event? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/parties/${party.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete event')
      }
      router.push('/parties')
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full capitalize',
          STATUS_COLORS[party.status] ?? 'bg-gray-100 text-gray-600',
        )}>
          {party.status}
        </span>
        <button
          onClick={remove}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={14} /> Delete
        </button>
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
            {t.key === 'checklist' && openTasks > 0 && (
              <span className="text-xs text-gray-400">({openTasks})</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <PartyOverviewTab party={party} rooms={rooms} guardians={guardians} students={students} />
      )}
      {tab === 'payments' && <PartyPaymentsTab party={party} />}
      {tab === 'checklist' && <PartyChecklistTab partyId={party.id} tasks={tasks} />}
      {tab === 'files' && <PartyFilesTab partyId={party.id} files={files} />}
      {tab === 'communication' && (
        <PartyCommsTab partyId={party.id} contactEmail={party.contact_email} contactName={party.contact_name} />
      )}
    </div>
  )
}
