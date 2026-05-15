'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  analytics: React.ReactNode
  library: React.ReactNode
}

type Tab = 'analytics' | 'library'

const TABS: { id: Tab; label: string }[] = [
  { id: 'analytics', label: 'Performance' },
  { id: 'library', label: 'Reports library' },
]

export default function ReportsTabs({ analytics, library }: Props) {
  const [tab, setTab] = useState<Tab>('analytics')
  return (
    <>
      <div className="flex gap-7 mb-7" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('pb-3 -mb-px text-sm font-medium transition-colors')}
              style={{
                color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                borderBottom: active ? '2px solid var(--grad-1)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {tab === 'analytics' ? analytics : library}
    </>
  )
}
