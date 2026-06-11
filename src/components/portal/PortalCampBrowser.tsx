'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import CampSignupCard from '@/components/portal/CampSignupCard'

export interface BrowseCamp {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  price: number
  age_min: number | null
  age_max: number | null
  spotsLeft: number | null
}

interface Student { id: string; first_name: string; last_name: string }

const selectCls = 'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

export default function PortalCampBrowser({ camps, students }: { camps: BrowseCamp[]; students: Student[] }) {
  const [q, setQ] = useState('')
  const [age, setAge] = useState('')
  const [openOnly, setOpenOnly] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const ageNum = age.trim() === '' ? null : Number(age)
    return camps.filter(c => {
      if (needle && !(`${c.name} ${c.description ?? ''}`.toLowerCase().includes(needle))) return false
      if (openOnly && c.spotsLeft != null && c.spotsLeft <= 0) return false
      if (ageNum != null && Number.isFinite(ageNum)) {
        if (c.age_min != null && ageNum < c.age_min) return false
        if (c.age_max != null && ageNum > c.age_max) return false
      }
      return true
    })
  }, [camps, q, age, openOnly])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search camps…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
          />
        </div>
        <input
          type="number"
          min={0}
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="Dancer age"
          className={`${selectCls} w-28`}
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} className="rounded text-studio-600" />
          Open spots
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No camps match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(camp => (
            <CampSignupCard key={camp.id} camp={camp} students={students} />
          ))}
        </div>
      )}
    </div>
  )
}
