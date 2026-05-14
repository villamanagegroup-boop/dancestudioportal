'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import ClassFormModal from '@/components/forms/ClassFormModal'
import RowActions from '@/components/admin/RowActions'

type SortKey = 'name' | 'day' | 'instructor' | 'room' | 'capacity' | 'tuition'
type SortDir = 'asc' | 'desc'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

interface ClassItem {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  max_students: number
  monthly_tuition: number
  active: boolean
  instructor: { first_name: string; last_name: string } | null
  room: { name: string } | null
  class_type: { name: string; style: string; color: string } | null
}

interface Props {
  classes: ClassItem[]
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  classTypes: any[]
  seasons: any[]
}

export default function ClassesView({ classes, instructors, rooms, classTypes, seasons }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('day')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const sortedClasses = [...classes].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'day') {
      cmp = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      if (cmp === 0) cmp = a.start_time.localeCompare(b.start_time)
    }
    else if (sortKey === 'instructor') cmp = (a.instructor ? `${a.instructor.last_name} ${a.instructor.first_name}` : '').localeCompare(b.instructor ? `${b.instructor.last_name} ${b.instructor.first_name}` : '')
    else if (sortKey === 'room') cmp = (a.room?.name ?? '').localeCompare(b.room?.name ?? '')
    else if (sortKey === 'capacity') cmp = a.max_students - b.max_students
    else if (sortKey === 'tuition') cmp = a.monthly_tuition - b.monthly_tuition
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
          >
            <Plus size={16} /> Add Class
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {([['name', 'Class'], ['day', 'Day / Time'], ['instructor', 'Instructor'], ['room', 'Room'], ['capacity', 'Capacity'], ['tuition', 'Tuition']] as [SortKey, string][]).map(([col, label]) => (
                  <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                    {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
                <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedClasses.map(cls => (
                <tr key={cls.id} className="group hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/classes/${cls.id}`} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cls.class_type?.color ?? '#7c3aed' }} />
                      <span className="text-sm font-medium text-gray-900 hover:text-studio-600">{cls.name}</span>
                      {!cls.active && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 capitalize">
                    {cls.day_of_week} · {formatTime(cls.start_time)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {cls.instructor ? `${cls.instructor.first_name} ${cls.instructor.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{cls.room?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{cls.max_students}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 font-medium">${cls.monthly_tuition}/mo</td>
                  <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                    <RowActions
                      endpoint={`/api/classes/${cls.id}`}
                      entityLabel="class"
                      archived={!cls.active}
                      archivePatch={{ active: false }}
                      restorePatch={{ active: true }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedClasses.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No classes found</div>
          )}
        </div>
      </div>
      {showModal && (
        <ClassFormModal
          onClose={() => setShowModal(false)}
          instructors={instructors}
          rooms={rooms}
          classTypes={classTypes}
          seasons={seasons}
        />
      )}
    </>
  )
}
