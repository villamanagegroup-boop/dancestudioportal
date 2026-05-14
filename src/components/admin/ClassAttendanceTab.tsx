'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Enrollment, ClassSession } from '@/components/admin/ClassDetail'

interface Props {
  classId: string
  enrollments: Enrollment[]
  sessions: ClassSession[]
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClassAttendanceTab({ classId, enrollments, sessions }: Props) {
  const router = useRouter()
  const active = enrollments.filter(e => e.status === 'active' && e.student)

  const marksForDate = (d: string) => {
    const session = sessions.find(s => s.session_date === d)
    const map: Record<string, boolean> = {}
    for (const e of active) {
      const rec = session?.attendance.find(a => a.student_id === e.student!.id)
      map[e.student!.id] = !!rec?.present
    }
    return map
  }

  const [date, setDate] = useState(today())
  const [marks, setMarks] = useState<Record<string, boolean>>(() => marksForDate(today()))
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
      const records = active.map(e => ({ student_id: e.student!.id, present: !!marks[e.student!.id] }))
      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_date: date, records }),
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

  const presentCount = active.filter(e => marks[e.student!.id]).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900 mr-auto">Take Attendance</h2>
          <input
            type="date"
            value={date}
            onChange={e => pickDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
          />
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {active.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No active students to track</div>
        ) : (
          <div className="p-4 space-y-1">
            {active.map(e => (
              <label key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!marks[e.student!.id]}
                  onChange={() => toggle(e.student!.id)}
                  className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  {e.student!.first_name} {e.student!.last_name}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <span className="text-sm text-gray-500 mr-auto">{presentCount} / {active.length} present</span>
          {savedAt && !saving && <span className="text-sm text-green-600">Saved</span>}
          <button
            onClick={save}
            disabled={saving || active.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Session history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Past Sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No sessions recorded</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map(s => {
              const present = s.attendance.filter(a => a.present).length
              return (
                <button
                  key={s.id}
                  onClick={() => pickDate(s.session_date)}
                  className={`flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50 ${
                    s.session_date === date ? 'bg-studio-50' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{formatDate(s.session_date)}</span>
                  <span className="text-xs text-gray-500">{present} / {s.attendance.length} present</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
