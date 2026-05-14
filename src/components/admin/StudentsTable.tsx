'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { getAgeFromDob } from '@/lib/utils'
import StudentFormModal from '@/components/forms/StudentFormModal'
import RowActions from '@/components/admin/RowActions'

type SortKey = 'name' | 'age' | 'guardian' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

interface Student {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  active: boolean
  guardian_students: Array<{
    guardian: { first_name: string; last_name: string; email: string } | null
  }>
}

interface Family {
  id: string
  first_name: string
  last_name: string
}

export default function StudentsTable({ students, families }: { students: Student[]; families: Family[] }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const primaryGuardian = (s: Student) => {
    const gs = s.guardian_students[0]
    if (!gs?.guardian) return '—'
    return `${gs.guardian.first_name} ${gs.guardian.last_name}`
  }

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = students
    .filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = '', bv = ''
      if (sortKey === 'name') { av = `${a.last_name} ${a.first_name}`; bv = `${b.last_name} ${b.first_name}` }
      else if (sortKey === 'age') { av = a.date_of_birth; bv = b.date_of_birth }
      else if (sortKey === 'guardian') { av = primaryGuardian(a); bv = primaryGuardian(b) }
      else if (sortKey === 'status') { av = String(a.active); bv = String(b.active) }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">
              {search ? 'No students match your search' : 'No students yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {(['name', 'age', 'guardian', 'status'] as SortKey[]).map(col => (
                    <th key={col} onClick={() => toggleSort(col)} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(student => (
                  <tr key={student.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 text-xs font-semibold flex-shrink-0">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {getAgeFromDob(student.date_of_birth)} yrs
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{primaryGuardian(student)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <RowActions
                          endpoint={`/api/students/${student.id}`}
                          entityLabel="student"
                          archived={!student.active}
                          archivePatch={{ active: false }}
                          restorePatch={{ active: true }}
                        />
                        <Link href={`/students/${student.id}`} className="text-gray-400 hover:text-gray-600">
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <StudentFormModal onClose={() => setShowModal(false)} families={families} />}
    </>
  )
}
