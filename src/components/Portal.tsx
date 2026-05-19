'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body so they escape ancestor stacking
 * contexts. This is required for modals because `.glass` etc. use
 * `backdrop-filter`, which per CSS spec creates a containing block for
 * `position: fixed` descendants — trapping modals inside the panel
 * rather than covering the viewport.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
