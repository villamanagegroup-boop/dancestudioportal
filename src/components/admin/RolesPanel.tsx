'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, GraduationCap, Handshake, Users, Check, Loader2 } from 'lucide-react'

type Role = 'admin' | 'instructor' | 'partner' | 'parent'

interface Entitlements {
  admin: boolean
  instructor: boolean
  partner: boolean
  parent: boolean
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; description: string }> = {
  admin: {
    label: 'Admin',
    icon: Shield,
    description: 'Full access to all studio management features.',
  },
  instructor: {
    label: 'Instructor',
    icon: GraduationCap,
    description: 'Can teach classes and access the instructor portal.',
  },
  partner: {
    label: 'Partner',
    icon: Handshake,
    description: 'Business partner with access to the partner portal.',
  },
  parent: {
    label: 'Parent',
    icon: Users,
    description: 'Can enroll dancers, pay invoices, and access the parent portal.',
  },
}

export default function RolesPanel({ profileId }: { profileId: string }) {
  const router = useRouter()
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null)
  const [parentPrimary, setParentPrimary] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<Role | null>(null)

  async function load() {
    setError('')
    try {
      const res = await fetch(`/api/accounts/${profileId}/roles`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load roles')
        return
      }
      setEntitlements(data.entitlements)
      setParentPrimary(!!data.parentPrimary)
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    }
  }

  useEffect(() => { load() }, [profileId])

  async function toggle(role: Role) {
    if (!entitlements) return
    const currentlyHas = entitlements[role]
    const action = currentlyHas ? 'remove' : 'add'

    if (currentlyHas && role === 'admin') {
      if (!confirm('Remove admin access? They will lose access to the admin panel.')) return
    }

    setBusy(role)
    setError('')
    try {
      const res = await fetch(`/api/accounts/${profileId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to update role')
        return
      }
      await load()
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Roles &amp; Portal Access</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Toggle which portals this account can access. Changes take effect immediately.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">{error}</div>
      )}

      <div className="divide-y divide-gray-50">
        {(['admin', 'instructor', 'partner', 'parent'] as Role[]).map(role => {
          const meta = ROLE_META[role]
          const Icon = meta.icon
          const active = entitlements?.[role] ?? false
          const isBusy = busy === role
          // Parent can't be toggled off when it's the account's primary role.
          const locked = role === 'parent' && parentPrimary
          return (
            <div key={role} className="px-5 py-3 flex items-center gap-3">
              <Icon size={18} className={active ? 'text-studio-600' : 'text-gray-400'} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-500">
                  {locked ? 'Primary role — always available.' : meta.description}
                </p>
              </div>
              {locked ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(role)}
                  disabled={isBusy || !entitlements}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-studio-50 text-studio-700 border border-studio-200 hover:bg-studio-100'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin inline" /> : active ? 'Remove' : 'Add'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
