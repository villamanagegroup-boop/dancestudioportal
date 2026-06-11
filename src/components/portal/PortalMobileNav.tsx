'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, Home, Calendar, Tent, CreditCard, FileText, Megaphone,
  UserCircle, LogOut, LayoutDashboard, ShieldCheck,
} from 'lucide-react'
import Portal from '@/components/Portal'

// Icons are referenced by string key so the items array stays serializable
// when passed from a Server Component layout to this Client Component.
const ICONS: Record<string, React.ElementType> = {
  home: Home, classes: Calendar, camps: Tent, billing: CreditCard,
  documents: FileText, news: Megaphone, account: UserCircle,
  policies: ShieldCheck, signout: LogOut, dashboard: LayoutDashboard,
}

export interface PortalNavItem {
  href: string
  label: string
  /** Key into the ICONS map above. */
  icon?: string
}

/**
 * Hamburger menu for the header-based portals (parent / partner). On <sm it
 * shows a button that opens a right-side slide-in drawer of nav links. Hidden
 * at sm+ where the inline header nav takes over. Uses inline-style transitions
 * so the slide always animates.
 */
export default function PortalMobileNav({ items, title = 'Menu' }: { items: PortalNavItem[]; title?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(id); document.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setShown(false)
    setTimeout(() => setOpen(false), 340)
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      {open && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
            <div
              onClick={close}
              style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                opacity: shown ? 1 : 0, transition: 'opacity 340ms ease',
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'absolute', top: 0, right: 0, height: '100%',
                width: '78%', maxWidth: 300, background: 'white',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
                display: 'flex', flexDirection: 'column',
                transform: shown ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)',
                transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid #f1f1f4', flexShrink: 0,
              }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>{title}</span>
                <button onClick={close} aria-label="Close menu"
                  style={{ color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
                {items.map(({ href, label, icon }) => {
                  const Icon = icon ? ICONS[icon] : undefined
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={close}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-studio-50 text-studio-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {Icon && <Icon size={18} />}
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
