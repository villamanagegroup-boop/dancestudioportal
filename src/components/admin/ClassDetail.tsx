'use client'

import { useState } from 'react'
import { formatTime, formatDate, getAgeFromDob, getEnrollmentStatusColor, cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface Props {
  cls: any
  enrollments: Array<{
    id: string
    status: string
    enrolled_at: string
    student: { id: string; first_name: string; last_name: string; date_of_birth: string } | null
  }>
}

export default function ClassDetail({ cls, enrollments }: Props) {
  const [showAttendance, setShowAttendance] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})

  const activeEnrollments = enrollments.filter(e => e.status === 'active')

  function toggleAttendance(studentId: string) {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  return (
    <>
      <div className="space-y-6">
        {/* Class info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <Info label="Day" value={cls.day_of_week?.charAt(0).toUpperCase() + cls.day_of_week?.slice(1)} />
              <Info label="Time" value={`${formatTime(cls.start_time)} – ${formatTime(cls.end_time)}`} />
              <Info label="Instructor" value={cls.instructor ? `${cls.instructor.first_name} ${cls.instructor.last_name}` : '—'} />
              <Info label="Room" value={cls.room?.name ?? '—'} />
              <Info label="Max Students" value={String(cls.max_students)} />
              <Info label="Monthly Tuition" value={`$${cls.monthly_tuition}`} />
              <Info label="Registration Fee" value={`$${cls.registration_fee}`} />
              <Info label="Enrolled" value={String(activeEnrollments.length)} />
            </div>
          </div>
        </div>

        {/* Roster */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Class Roster ({enrollments.length})</h2>
            <button
              onClick={() => setShowAttendance(true)}
              className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
            >
              Take Attendance
            </button>
          </div>
          {enrollments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No students enrolled</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Enrolled</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrollments.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {e.student ? `${getAgeFromDob(e.student.date_of_birth)} yrs` : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(e.enrolled_at)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', getEnrollmentStatusColor(e.status))}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Take Attendance</h2>
              <button onClick={() => setShowAttendance(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {activeEnrollments.map(e => (
                <label key={e.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!attendance[e.student?.id ?? '']}
                    onChange={() => toggleAttendance(e.student?.id ?? '')}
                    className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {e.student ? `${e.student.first_name} ${e.student.last_name}` : '—'}
                  </span>
                </label>
              ))}
              {activeEnrollments.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No active students</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAttendance(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => setShowAttendance(false)}
                className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700"
              >
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
