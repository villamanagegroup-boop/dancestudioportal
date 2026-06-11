'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Search, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'
import NotificationBell from '@/components/admin/NotificationBell'

interface HeaderProps {
  title: string
  subtitle?: string
  /**
   * Render a back control before the title. Pass an href string to navigate to
   * a specific parent page (preferred — predictable), or `true` to use the
   * browser's history (router.back()).
   */
  back?: string | boolean
}

export default function Header({ title, subtitle, back }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const backBtnClass = 'icon-btn flex-shrink-0'
  const backTitle = 'Back'

  return (
    <header className="h-16 bg-transparent flex items-center gap-4 px-6 flex-shrink-0 relative z-10 pl-16 md:pl-6">
      {back != null && back !== false && (
        typeof back === 'string'
          ? (
            <Link href={back} className={backBtnClass} title={backTitle} aria-label={backTitle}>
              <ArrowLeft size={16} />
            </Link>
          )
          : (
            <button onClick={() => router.back()} className={backBtnClass} title={backTitle} aria-label={backTitle}>
              <ArrowLeft size={16} />
            </button>
          )
      )}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</h1>
        {subtitle && <p className="text-sm hidden sm:block" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>}
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
        <NotificationBell />
        <button onClick={handleSignOut} className="icon-btn" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
