'use client'

import { useState, useCallback } from 'react'

// Shared multi-row selection state for bulk actions across list tables.
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Select / deselect a whole list at once (header checkbox).
  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  return { selected, toggle, setMany, clear }
}
