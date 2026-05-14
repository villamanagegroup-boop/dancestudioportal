'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, ChevronRight, ChevronUp, ChevronDown, Users } from 'lucide-react'
import FamilyFormModal from '@/components/forms/FamilyFormModal'
import RowActions from '@/components/admin/RowActions'

interface Family {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  active: boolean
  created_at: string
  student_count: number
}

type SortKey = 'name' | 'email' | 'students' | 'joined'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-studio-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-studio-600 ml-1 inline" />
}

export default function FamiliesTable({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = families
    .filter(f => {
      const q = search.toLowerCase()
      return `${f.first_name} ${f.last_name} ${f.email}`.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      else if (sortKey === 'email') cmp = a.email.localeCompare(b.email)
      else if (sortKey === 'students') cmp = a.student_count - b.student_count
      else if (sortKey === 'joined') cmp = a.created_at.localeCompare(b.created_at)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const cols: [SortKey, string][] = [['name', 'Name'], ['email', 'Email'], ['students', 'Students'], ['joined', 'Joined']]

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search families..."
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
            Add Family
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">
              {search ? 'No families match your search' : 'No family accounts yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {cols.map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                    >
                      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(family => (
                  <tr key={family.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 text-xs font-semibold flex-shrink-0">
                          {family.first_name[0]}{family.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {family.first_name} {family.last_name}
                        </span>
                        {!family.active && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{family.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${family.student_count > 0 ? 'bg-studio-50 text-studio-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Users size={11} />
                        {family.student_count} {family.student_count === 1 ? 'student' : 'students'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(family.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{family.phone ?? '—'}</td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <RowActions
                          endpoint={`/api/families/${family.id}`}
                          entityLabel="family"
                          archived={!family.active}
                          archivePatch={{ active: false }}
                          restorePatch={{ active: true }}
                        />
                        <Link href={`/families/${family.id}`} className="text-gray-400 hover:text-gray-600">
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
      {showModal && <FamilyFormModal onClose={() => setShowModal(false)} />}
    </>
  )
}
