'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Bell, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-transparent flex items-center gap-4 px-6 flex-shrink-0 relative z-10">
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>}
      </div>

      <div
        className="hidden md:flex items-center gap-2.5 px-3.5 py-2 flex-1 max-w-md ml-6"
        style={{
          borderRadius: 999,
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(255,255,255,.55)',
          boxShadow: '0 1px 0 rgba(255,255,255,.7) inset, 0 2px 8px rgba(40,32,120,.04)',
        }}
      >
        <Search size={16} style={{ color: 'var(--ink-3)' }} />
        <input
          placeholder="Search students, classes, families…"
          className="flex-1 bg-transparent outline-none border-0 text-sm"
          style={{ color: 'var(--ink-1)' }}
        />
        <kbd
          className="text-[10.5px] font-medium px-1.5 py-0.5"
          style={{
            color: 'var(--ink-3)',
            background: 'rgba(20,24,80,0.06)',
            borderRadius: 5,
            border: '1px solid var(--line)',
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <ThemeSwitcher />
        <button className="icon-btn" title="Notifications">
          <Bell size={16} />
          <span
            style={{
              position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--grad-3), var(--grad-1))',
              boxShadow: '0 0 0 2px var(--glass-thin)',
            }}
          />
        </button>
        <button onClick={handleSignOut} className="icon-btn" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
