'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getAgeFromDob } from '@/lib/utils'

interface LinkedStudent {
  relationship: string
  is_primary: boolean
  student: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    active: boolean
  } | null
}

interface AvailableStudent {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  familyId: string
  linkedStudents: LinkedStudent[]
  availableStudents: AvailableStudent[]
}

export default function FamilyStudentManager({ familyId, linkedStudents, availableStudents }: Props) {
  const router = useRouter()
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function linkStudent() {
    if (!selectedId) return
    setLinking(true)
    setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selectedId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to link student')
      setShowLinkPanel(false)
      setSelectedId('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLinking(false)
    }
  }

  async function unlinkStudent(studentId: string) {
    setUnlinking(studentId)
    setError('')
    try {
      const res = await fetch(`/api/families/${familyId}/students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to unlink student')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUnlinking(null)
    }
  }

  const students = linkedStudents.filter(ls => ls.student !== null)

  return (
    <div>
      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {students.length === 0 && !showLinkPanel ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">No students linked to this family</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {students.map(({ student, relationship, is_primary }) => (
            <div key={student!.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 text-xs font-semibold flex-shrink-0">
                  {student!.first_name[0]}{student!.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {student!.first_name} {student!.last_name}
                    {is_primary && <span className="ml-2 text-xs text-studio-600 bg-studio-50 px-1.5 py-0.5 rounded-full">primary</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    Age {getAgeFromDob(student!.date_of_birth)} · {relationship}
                    {!student!.active && ' · Inactive'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/students/${student!.id}`} className="text-gray-400 hover:text-gray-600">
                  <ChevronRight size={16} />
                </Link>
                <button
                  onClick={() => unlinkStudent(student!.id)}
                  disabled={unlinking === student!.id}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Unlink student"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLinkPanel ? (
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 items-center">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500"
          >
            <option value="">Select a student...</option>
            {availableStudents.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
          <button
            onClick={linkStudent}
            disabled={!selectedId || linking}
            className="px-3 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            {linking ? 'Linking...' : 'Link'}
          </button>
          <button onClick={() => setShowLinkPanel(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-gray-50">
          <button
            onClick={() => setShowLinkPanel(true)}
            className="flex items-center gap-1.5 text-sm text-studio-600 hover:text-studio-700 font-medium"
          >
            <Plus size={15} /> Link existing student
          </button>
        </div>
      )}
    </div>
  )
}
