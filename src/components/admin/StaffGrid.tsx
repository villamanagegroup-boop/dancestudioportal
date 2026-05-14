'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown } from 'lucide-react'
import RowActions from '@/components/admin/RowActions'

interface Instructor {
  id: string
  first_name: string
  last_name: string
  email: string
  specialties: string[] | null
  background_check_expires: string | null
  active: boolean
}

type SortKey = 'name' | 'email'
type SortDir = 'asc' | 'desc'

function SortBtn({
  col,
  label,
  activeKey,
  dir,
  onToggle,
}: {
  col: SortKey
  label: string
  activeKey: SortKey
  dir: SortDir
  onToggle: (col: SortKey) => void
}) {
  return (
    <button
      onClick={() => onToggle(col)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
    >
      {label}
      {activeKey === col
        ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        : <ChevronUp size={12} className="text-gray-300" />}
    </button>
  )
}

export default function StaffGrid({ instructors }: { instructors: Instructor[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const sorted = [...instructors].sort((a, b) => {
    const av = sortKey === 'name' ? `${a.last_name} ${a.first_name}` : a.email
    const bv = sortKey === 'name' ? `${b.last_name} ${b.first_name}` : b.email
    const cmp = av.localeCompare(bv)
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (!instructors.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm shadow-sm">
        No instructors added yet
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        Sort by:{' '}
        <SortBtn col="name" label="Name" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />{' '}
        <SortBtn col="email" label="Email" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map(instructor => (
          <div key={instructor.id} className="relative">
            <div className="absolute top-3 right-3 z-10">
              <RowActions
                endpoint={`/api/instructors/${instructor.id}`}
                entityLabel="instructor"
                archived={!instructor.active}
                archivePatch={{ active: false }}
                restorePatch={{ active: true }}
              />
            </div>
            <Link href={`/staff/${instructor.id}`}>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-lg mb-3">
                {instructor.first_name[0]}{instructor.last_name[0]}
              </div>
              <h3 className="font-semibold text-gray-900">
                {instructor.first_name} {instructor.last_name}
                {!instructor.active && (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{instructor.email}</p>
              {instructor.specialties && instructor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {instructor.specialties.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs bg-studio-50 text-studio-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              {instructor.background_check_expires && (
                <p className="text-xs text-gray-400 mt-3">
                  BG check expires: {new Date(instructor.background_check_expires).toLocaleDateString()}
                </p>
              )}
            </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}
