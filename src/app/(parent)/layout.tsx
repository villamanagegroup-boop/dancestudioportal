import Link from 'next/link'
import { Home, Calendar, CreditCard, FileText, LogOut } from 'lucide-react'

const navItems = [
  { href: '/portal', icon: Home, label: 'Home' },
  { href: '/portal/classes', icon: Calendar, label: 'Classes' },
  { href: '/portal/billing', icon: CreditCard, label: 'Billing' },
  { href: '/portal/documents', icon: FileText, label: 'Documents' },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-studio-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Capital Core</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={15} />
            Sign out
          </Link>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden border-t border-gray-100 px-4">
          <nav className="flex">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-gray-500 hover:text-studio-600">
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
