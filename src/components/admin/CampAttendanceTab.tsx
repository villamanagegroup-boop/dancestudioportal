'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { CampRegistration, CampAttendanceRec } from '@/components/admin/CampDetail'

interface Props {
  campId: string
  startDate: string
  endDate: string
  registrations: CampRegistration[]
  attendance: CampAttendanceRec[]
}

function campDays(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  let guard = 0
  while (d <= last && guard < 366) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
    guard++
  }
  return days
}

export default function CampAttendanceTab({ campId, startDate, endDate, registrations, attendance }: Props) {
  const router = useRouter()
  const days = campDays(startDate, endDate)
  const registered = registrations.filter(r => r.status === 'registered' && r.student)

  const marksForDate = (d: string) => {
    const map: Record<string, boolean> = {}
    for (const r of registered) {
      const rec = attendance.find(a => a.attend_date === d && a.student_id === r.student!.id)
      map[r.student!.id] = !!rec?.present
    }
    return map
  }

  const initialDay = days.includes(new Date().toISOString().slice(0, 10))
    ? new Date().toISOString().slice(0, 10)
    : days[0] ?? ''

  const [date, setDate] = useState(initialDay)
  const [marks, setMarks] = useState<Record<string, boolean>>(() => marksForDate(initialDay))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function pickDate(d: string) {
    setDate(d)
    setMarks(marksForDate(d))
    setSavedAt(null)
  }

  function toggle(studentId: string) {
    setMarks(m => ({ ...m, [studentId]: !m[studentId] }))
    setSavedAt(null)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const records = registered.map(r => ({
        student_id: r.student!.id,
        present: !!marks[r.student!.id],
      }))
      const res = await fetch(`/api/camps/${campId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attend_date: date, records }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save attendance')
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const presentCount = registered.filter(r => marks[r.student!.id]).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900 mr-auto">Take Attendance</h2>
          <select
            value={date}
            onChange={e => pickDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
          >
            {days.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {registered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No registered students to track</div>
        ) : (
          <div className="p-4 space-y-1">
            {registered.map(r => (
              <label key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!marks[r.student!.id]}
                  onChange={() => toggle(r.student!.id)}
                  className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  {r.student!.first_name} {r.student!.last_name}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <span className="text-sm text-gray-500 mr-auto">{presentCount} / {registered.length} present</span>
          {savedAt && !saving && <span className="text-sm text-green-600">Saved</span>}
          <button
            onClick={save}
            disabled={saving || registered.length === 0 || !date}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Day summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Camp Days</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {days.map(d => {
            const present = attendance.filter(a => a.attend_date === d && a.present).length
            const tracked = attendance.some(a => a.attend_date === d)
            return (
              <button
                key={d}
                onClick={() => pickDate(d)}
                className={`flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50 ${
                  d === date ? 'bg-studio-50' : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{formatDate(d)}</span>
                <span className="text-xs text-gray-500">
                  {tracked ? `${present} / ${registered.length} present` : 'Not taken'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
