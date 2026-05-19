'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'

type SortDir = 'asc' | 'desc'

interface Props<K extends string> {
  col: K
  label: string
  activeKey: K | null
  dir: SortDir
  onToggle: (col: K) => void
  className?: string
  align?: 'left' | 'right' | 'center'
}

/**
 * Sortable table header cell. Click to toggle sort direction; clicking a
 * different column resets to ascending.
 */
export default function SortableTh<K extends string>({
  col, label, activeKey, dir, onToggle, className, align = 'left',
}: Props<K>) {
  const isActive = activeKey === col
  const Icon = isActive ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronUp
  return (
    <th className={className ?? 'text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase'}
      style={{ textAlign: align }}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        {label}
        <Icon size={12} className={isActive ? 'text-gray-700' : 'text-gray-300'} />
      </button>
    </th>
  )
}
