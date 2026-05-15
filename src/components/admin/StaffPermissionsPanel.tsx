'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PERMISSION_CATALOG, ROLE_DEFAULTS, ROLE_LABELS, ROLE_DESCRIPTIONS, STAFF_ROLES,
  PERM_LEVELS, PERM_LEVEL_LABEL, isStaffRole,
  type PermLevel, type StaffRole,
} from '@/lib/permissions'

interface Props {
  instructor: {
    id: string
    first_name: string
    staff_role?: string | null
    permission_overrides?: Record<string, PermLevel> | null
  }
}

export default function StaffPermissionsPanel({ instructor }: Props) {
  const router = useRouter()
  const [role, setRole] = useState<StaffRole>(
    isStaffRole(instructor.staff_role) ? instructor.staff_role : 'instructor',
  )
  const [overrides, setOverrides] = useState<Record<string, PermLevel>>(
    () => ({ ...(instructor.permission_overrides ?? {}) }),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const roleDefaults = ROLE_DEFAULTS[role]

  function effective(key: string): PermLevel {
    return overrides[key] ?? roleDefaults[key] ?? 'none'
  }
  function isCustom(key: string): boolean {
    return overrides[key] != null && overrides[key] !== roleDefaults[key]
  }

  const customCount = useMemo(
    () => Object.keys(overrides).filter(k => overrides[k] !== ROLE_DEFAULTS[role][k]).length,
    [overrides, role],
  )

  function changeRole(next: StaffRole) {
    setRole(next)
    // drop overrides that now match the new role's defaults
    setOverrides(prev => {
      const cleaned: Record<string, PermLevel> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v !== ROLE_DEFAULTS[next][k]) cleaned[k] = v
      }
      return cleaned
    })
    setSaved(false)
  }

  function setLevel(key: string, level: PermLevel) {
    setOverrides(prev => {
      const next = { ...prev }
      if (level === roleDefaults[key]) delete next[key]
      else next[key] = level
      return next
    })
    setSaved(false)
  }

  function resetKey(key: string) {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const cleaned: Record<string, PermLevel> = {}
      for (const [k, v] of Object.entries(overrides)) {
        if (v !== roleDefaults[k]) cleaned[k] = v
      }
      const res = await fetch(`/api/instructors/${instructor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_role: role, permission_overrides: cleaned }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save permissions')
      }
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Shield size={16} className="text-studio-600" />
        <div>
          <h2 className="font-semibold text-gray-900">Roles & Permissions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pick a role for the baseline, then fine-tune anything for {instructor.first_name}.
          </p>
        </div>
      </div>

      {/* Role selector */}
      <div className="p-5 border-b border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAFF_ROLES.map(r => (
            <button
              key={r}
              onClick={() => changeRole(r)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                role === r
                  ? 'bg-studio-600 text-white border-studio-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-studio-300',
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{ROLE_DESCRIPTIONS[role]}</p>
      </div>

      {/* Permission catalog */}
      <div className="divide-y divide-gray-100">
        {PERMISSION_CATALOG.map(category => (
          <div key={category.name} className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{category.name}</p>
            <div className="space-y-1">
              {category.permissions.map(perm => {
                const value = effective(perm.key)
                const custom = isCustom(perm.key)
                return (
                  <div key={perm.key} className="flex items-center gap-4 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-800">{perm.label}</p>
                        {custom && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Customized" />
                        )}
                      </div>
                      {perm.description && <p className="text-xs text-gray-400">{perm.description}</p>}
                    </div>

                    {custom && (
                      <button
                        onClick={() => resetKey(perm.key)}
                        className="text-gray-300 hover:text-gray-600 shrink-0"
                        title="Reset to role default"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                      {PERM_LEVELS.map(level => {
                        const selected = value === level
                        return (
                          <button
                            key={level}
                            onClick={() => setLevel(perm.key, level)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium transition-colors w-16',
                              selected
                                ? custom
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-studio-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50',
                            )}
                          >
                            {PERM_LEVEL_LABEL[level]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {customCount === 0
            ? `Using the ${ROLE_LABELS[role]} role defaults`
            : `${customCount} permission${customCount === 1 ? '' : 's'} customized from the ${ROLE_LABELS[role]} role`}
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          {saved && !saving && (
            <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}
