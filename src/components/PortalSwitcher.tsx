'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Shield, GraduationCap, Users, Check } from 'lucide-react'

type PortalKey = 'admin' | 'instructor' | 'parent'

const PORTALS: { key: PortalKey; label: string; href: string; icon: React.ElementType }[] = [
  { key: 'admin', label: 'Admin', href: '/dashboard', icon: Shield },
  { key: 'instructor', label: 'Instructor', href: '/my-classes', icon: GraduationCap },
  { key: 'parent', label: 'Parent', href: '/portal', icon: Users },
]

interface Props {
  role: string
  current: PortalKey
}

export default function PortalSwitcher({ role, current }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Only admins can hop between portals
  if (role !== 'admin') return null

  const cur = PORTALS.find(p => p.key === current)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white/70 border border-gray-200 hover:bg-white transition-colors"
      >
        <span className="text-gray-400">Viewing:</span>
        <span className="text-gray-900">{cur?.label}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-48 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden py-1">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Switch portal
            </p>
            {PORTALS.map(p => {
              const Icon = p.icon
              const active = p.key === current
              return (
                <button
                  key={p.key}
                  onClick={() => { setOpen(false); router.push(p.href) }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                    active ? 'text-studio-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <Icon size={15} className={active ? 'text-studio-600' : 'text-gray-400'} />
                  <span className="flex-1">{p.label}</span>
                  {active && <Check size={14} className="text-studio-600" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
