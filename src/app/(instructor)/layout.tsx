import Link from 'next/link'
import { Home, Calendar, Users, LogOut } from 'lucide-react'

const NAV = [
  { href: '/my-classes', icon: Calendar, label: 'My Classes' },
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/students', icon: Users, label: 'Students' },
]

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <header className="glass rounded-none border-x-0 border-t-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="brand-mark" style={{ width: 28, height: 28, borderRadius: 9 }}>
              <span className="text-white text-[10px] font-bold">CC</span>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--ink-1)' }}>Capital Core — Instructor</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--ink-3)' }}
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile bottom-tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 glass rounded-none border-x-0 border-b-0">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
              style={{ color: 'var(--ink-3)' }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
