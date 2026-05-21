import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface SubNavCard {
  href: string
  icon: React.ElementType
  label: string
  desc?: string
}

/**
 * Prominent quick-link cards for a section's sub-pages. Used on the landing
 * dashboards (Accounts, Activities, Admin) so the sub-pages stay reachable
 * even when the sidebar is collapsed to main icons only.
 */
export default function SubNavCards({ cards }: { cards: SubNavCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
      {cards.map(({ href, icon: Icon, label, desc }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-center gap-3 p-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'var(--glass-thin)', border: '1px solid var(--line)' }}
        >
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 text-white"
            style={{
              background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2) 55%, var(--grad-3))',
              boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--grad-1) 55%, transparent)',
            }}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm" style={{ color: 'var(--ink-1)' }}>{label}</div>
            {desc && <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{desc}</div>}
          </div>
          <ChevronRight
            size={16}
            className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--ink-4)' }}
          />
        </Link>
      ))}
    </div>
  )
}
