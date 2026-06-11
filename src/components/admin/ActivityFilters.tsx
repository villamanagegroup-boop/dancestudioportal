'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

const CATEGORIES: { key: string; label: string }[] = [
  { key: '', label: 'All activity' },
  { key: 'auth', label: 'Logins' },
  { key: 'student', label: 'Students' },
  { key: 'family', label: 'Families' },
  { key: 'enrollment', label: 'Enrollments' },
  { key: 'class', label: 'Classes' },
  { key: 'camp', label: 'Camps' },
  { key: 'party', label: 'Parties' },
  { key: 'staff', label: 'Staff' },
  { key: 'payment', label: 'Payments' },
  { key: 'intake', label: 'Intake' },
]

const RANGES: { key: string; label: string }[] = [
  { key: '1', label: 'Today' },
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
]

export default function ActivityFilters({
  cat, days, q,
}: { cat: string; days: string; q: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [search, setSearch] = useState(q)

  // Keep the local input in sync if the URL changes from elsewhere.
  useEffect(() => { setSearch(q) }, [q])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`${pathname}?${next.toString()}`)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setParam('q', search.trim())
  }

  return (
    <div className="space-y-3 mb-5">
      <form
        onSubmit={submitSearch}
        className="flex items-center gap-2.5 px-3.5 py-2 max-w-md"
        style={{
          borderRadius: 999,
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid var(--line)',
        }}
      >
        <Search size={16} style={{ color: 'var(--ink-3)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search people, actions…"
          className="flex-1 bg-transparent outline-none border-0 text-sm"
          style={{ color: 'var(--ink-1)' }}
        />
      </form>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => {
          const active = c.key === cat
          return (
            <button
              key={c.key || 'all'}
              onClick={() => setParam('cat', c.key)}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={active
                ? { background: 'var(--ink-1)', color: '#fff' }
                : { background: 'rgba(20,24,80,0.06)', color: 'var(--ink-2)' }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RANGES.map(r => {
          const active = r.key === days
          return (
            <button
              key={r.key}
              onClick={() => setParam('days', r.key)}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={active
                ? { background: 'var(--grad-1)', color: '#fff' }
                : { background: 'rgba(20,24,80,0.06)', color: 'var(--ink-3)' }}
            >
              {r.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
