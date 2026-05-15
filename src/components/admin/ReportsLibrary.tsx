'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Clock } from 'lucide-react'
import { REPORT_CATALOG, REPORT_CATEGORIES, type ReportCategory } from '@/lib/reports'

export default function ReportsLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'All' | ReportCategory>('All')
  const [showSoon, setShowSoon] = useState(true)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return REPORT_CATALOG.filter(r => {
      if (!showSoon && r.status === 'coming_soon') return false
      if (category !== 'All' && r.category !== category) return false
      if (q && !(`${r.id} ${r.title} ${r.description}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [query, category, showSoon])

  const grouped = useMemo(() => {
    const map = new Map<ReportCategory, typeof REPORT_CATALOG>()
    for (const r of filtered) {
      if (!map.has(r.category)) map.set(r.category, [])
      map.get(r.category)!.push(r)
    }
    return map
  }, [filtered])

  const availableCount = REPORT_CATALOG.filter(r => r.status === 'available').length
  const totalCount = REPORT_CATALOG.length

  const inputCls = 'px-3 py-2 rounded-lg border text-sm focus:outline-none'
  const inputStyle = { background: 'var(--glass-thin)', borderColor: 'var(--line)', color: 'var(--ink-1)' }

  return (
    <section>
      <div className="eyebrow-row">
        <span className="eyebrow">Reports library</span>
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {availableCount} of {totalCount} ready to run
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search reports…"
            className={inputCls + ' w-full pl-9'}
            style={inputStyle}
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as any)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="All">All categories</option>
          {REPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ink-2)' }}>
          <input
            type="checkbox"
            checked={showSoon}
            onChange={e => setShowSoon(e.target.checked)}
            className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
            style={{ accentColor: 'var(--grad-1)' }}
          />
          Show upcoming
        </label>
      </div>

      {grouped.size === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No reports match.</p>
      ) : (
        [...grouped.entries()].map(([cat, reports], idx) => (
          <div key={cat}>
            {idx > 0 && <hr className="section-rule" />}
            <div className="eyebrow-row">
              <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>{cat}</span>
              <span className="text-xs" style={{ color: 'var(--ink-4)' }}>{reports.length}</span>
            </div>
            <div className="tight-list grid grid-cols-1 md:grid-cols-2 gap-x-10" style={{ display: 'grid' }}>
              {reports.map(r => {
                const available = r.status === 'available'
                const content = (
                  <>
                    <div className="tl-lead" style={{ width: 56 }}>
                      <div className="t" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: 'var(--ink-3)' }}>{r.id}</div>
                    </div>
                    <div className="tl-main">
                      <div className="t">{r.title}</div>
                      <div className="s">{r.description}</div>
                    </div>
                    <div className="tl-trail">
                      {available ? (
                        <span style={{ color: 'var(--ink-3)' }}>→</span>
                      ) : (
                        <span className="tag tag-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> Soon
                        </span>
                      )}
                    </div>
                  </>
                )
                return available
                  ? <Link key={r.id} href={`/reports/${r.id}`} className="tl-row">{content}</Link>
                  : <div key={r.id} className="tl-row" style={{ opacity: 0.55 }}>{content}</div>
              })}
            </div>
          </div>
        ))
      )}
    </section>
  )
}
