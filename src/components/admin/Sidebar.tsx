'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, CalendarDays, ClipboardList,
  CreditCard, UserCheck, MessageSquare, Settings,
  Menu, X, Home, ChevronDown, ChevronRight,
  Tent, Sparkles, CalendarCheck, BarChart2, GraduationCap,
  Handshake, Activity, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PortalSwitcher from '@/components/PortalSwitcher'

interface NavChild { href: string; icon: React.ElementType; label: string }
interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { href: '/communications', icon: MessageSquare, label: 'Communications' },
  {
    href: '/accounts',
    icon: Users,
    label: 'Accounts',
    children: [
      { href: '/families', icon: Home, label: 'Families' },
      { href: '/students', icon: GraduationCap, label: 'Students' },
      { href: '/partners', icon: Handshake, label: 'Partners' },
    ],
  },
  {
    href: '/activities',
    icon: Activity,
    label: 'Activities',
    children: [
      { href: '/classes', icon: Calendar, label: 'Classes' },
      { href: '/camps', icon: Tent, label: 'Camps' },
      { href: '/enrollments', icon: ClipboardList, label: 'Enrollments' },
    ],
  },
  { href: '/parties', icon: Sparkles, label: 'Events' },
  { href: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  {
    href: '/admin',
    icon: ShieldCheck,
    label: 'Admin',
    children: [
      { href: '/billing', icon: CreditCard, label: 'Billing' },
      { href: '/reports', icon: BarChart2, label: 'Reports' },
      { href: '/staff', icon: UserCheck, label: 'Staff' },
    ],
  },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const activeStyle = {
  background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2) 55%, var(--grad-3))',
  boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--grad-1) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.3)',
}

function NavLink({ href, icon: Icon, label, active, onClick }: {
  href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        active ? 'text-white shadow-lg' : 'hover:bg-white/50',
      )}
      style={active ? activeStyle : { color: 'var(--ink-2)' }}
    >
      <Icon size={18} />
      {label}
    </Link>
  )
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const item of navItems) {
      if (item.children) {
        init[item.href] =
          isActive(pathname, item.href) || item.children.some(c => isActive(pathname, c.href))
      }
    }
    return init
  })

  function toggleGroup(href: string) {
    setOpenGroups(g => ({ ...g, [href]: !g[href] }))
  }

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="brand-mark flex-shrink-0">
          <span className="text-white text-sm font-bold">CC</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink-1)' }}>Capital Core</p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Dance Studio</p>
        </div>
      </div>
      {role === 'admin' && (
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
          <PortalSwitcher role={role} current="admin" />
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0">
        {navItems.map(item => {
          if (item.children) {
            const childMatch = item.children.some(c => isActive(pathname, c.href))
            const parentActive = isActive(pathname, item.href) && !childMatch
            const open = openGroups[item.href]

            return (
              <div key={item.href}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      parentActive ? 'text-white shadow-lg' : 'hover:bg-white/50',
                    )}
                    style={parentActive ? activeStyle : { color: 'var(--ink-2)' }}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className="p-2 transition-colors"
                    style={{ color: 'var(--ink-4)' }}
                    aria-label={`Toggle ${item.label}`}
                  >
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                {open && (
                  <div className="ml-4 mt-0.5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--line)' }}>
                    {item.children.map(child => (
                      <NavLink
                        key={child.href}
                        href={child.href}
                        icon={child.icon}
                        label={child.label}
                        active={isActive(pathname, child.href)}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(pathname, item.href)}
              onClick={() => setMobileOpen(false)}
            />
          )
        })}
      </nav>

      <div className="px-3 pb-4 pt-2">
        <div
          className="relative overflow-hidden p-4"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(160deg, color-mix(in srgb, var(--grad-1) 90%, white), color-mix(in srgb, var(--grad-3) 80%, white))',
            color: 'white',
            boxShadow: '0 10px 30px -8px color-mix(in srgb, var(--grad-1) 50%, transparent), inset 0 1px 0 rgba(255,255,255,.3)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,.45), transparent 60%)',
            }}
          />
          <h4 className="m-0 mb-1" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>Spring Showcase</h4>
          <p className="m-0 mb-2.5" style={{ fontSize: 11.5, opacity: 0.92, lineHeight: 1.45 }}>
            Costume fittings open Monday. Reserve your dancer&apos;s slot.
          </p>
          <Link
            href="/parties"
            className="inline-block"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: 'var(--ink-1)',
              fontWeight: 600,
              fontSize: 12,
              padding: '7px 12px',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,.12)',
              textDecoration: 'none',
            }}
          >
            Reserve →
          </Link>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile-only chrome — wrapped so the parent's display:none always wins */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 icon-btn"
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
            'fixed inset-y-0 left-0 z-50 w-64 glass-strong flex flex-col transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ borderRadius: 0 }}
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

      {/* Tablet rail (md → <lg) — icon-only base, expands on hover */}
      <aside
        className="sidebar-rail hidden md:flex lg:hidden flex-col fixed inset-y-0 left-0 z-30 glass-strong"
        style={{ borderRadius: 0, borderRight: '1px solid var(--line)' }}
      >
        {navContent}
      </aside>

      {/* Desktop full sidebar (lg+) */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 z-30 glass-strong"
        style={{ borderRadius: 0, borderRight: '1px solid var(--line)' }}
      >
        {navContent}
      </aside>
    </>
  )
}
