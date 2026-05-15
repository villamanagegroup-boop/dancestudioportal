'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Calendar, Users, Inbox, Settings,
  Menu, X, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PortalSwitcher from '@/components/PortalSwitcher'

const navItems = [
  { href: '/instructor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/instructor/my-classes', icon: Calendar, label: 'My Classes' },
  { href: '/instructor/students', icon: Users, label: 'Students' },
  { href: '/instructor/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/instructor/settings', icon: Settings, label: 'Settings' },
]

const activeStyle = {
  background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2) 55%, var(--grad-3))',
  boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--grad-1) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.3)',
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function InstructorSidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="brand-mark flex-shrink-0">
          <span className="text-white text-sm font-bold">CC</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink-1)' }}>Capital Core</p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Instructor Portal</p>
        </div>
      </div>

      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <PortalSwitcher role={role} current="instructor" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0">
        {navItems.map(item => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'text-white shadow-lg' : 'hover:bg-white/50',
              )}
              style={active ? activeStyle : { color: 'var(--ink-2)' }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--line)' }}>
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium hover:bg-white/50 transition-colors"
          style={{ color: 'var(--ink-3)' }}
        >
          <LogOut size={16} />
          Sign out
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 z-50 icon-btn"
          style={{ top: 'calc(16px + var(--preview-h, 0px))' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10, 12, 40, 0.32)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div
          className={cn(
            'fixed left-0 z-50 w-64 glass-strong flex flex-col transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ top: 'var(--preview-h, 0px)', bottom: 0, borderRadius: 0 }}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          {navContent}
        </div>
      </div>

      {/* Tablet rail */}
      <aside
        className="sidebar-rail hidden md:flex lg:hidden flex-col fixed left-0 z-30 glass-strong"
        style={{ top: 'var(--preview-h, 0px)', bottom: 0, borderRadius: 0, borderRight: '1px solid var(--line)' }}
      >
        {navContent}
      </aside>

      {/* Desktop */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed z-30 glass-strong"
        style={{ top: 'var(--preview-h, 0px)', bottom: 0, left: 0, borderRadius: 0, borderRight: '1px solid var(--line)' }}
      >
        {navContent}
      </aside>
    </>
  )
}
