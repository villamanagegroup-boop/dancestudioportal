'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface SidebarCtx {
  collapsed: boolean
  toggle: () => void
}

const Ctx = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} })

export function useSidebarCollapse() {
  return useContext(Ctx)
}

/**
 * Client shell for the admin + instructor portals. Owns the sidebar
 * collapse state (persisted to localStorage), exposes it via context to the
 * sidebar toggle, and reflects it as data-collapsed on the shell so CSS can
 * drive the content's left padding. Defaults to collapsed on tablet widths.
 */
export default function AdminShell({ preview = false, children }: { preview?: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === '1')
    else setCollapsed(window.innerWidth < 1024)
  }, [])

  function toggle() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  return (
    <Ctx.Provider value={{ collapsed, toggle }}>
      <div
        className="admin-shell flex h-screen"
        data-collapsed={collapsed ? 'true' : 'false'}
        style={{ ['--preview-h' as any]: preview ? '36px' : '0px' }}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}
