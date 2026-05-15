'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export interface ToggleDef {
  key: string
  label: string
  description?: string
}

export interface ToggleSection {
  title?: string
  toggles: ToggleDef[]
}

interface Props {
  settingsKey: string
  title: string
  subtitle?: string
  sections: ToggleSection[]
  defaults: Record<string, boolean>
  initial: Record<string, any> | null
}

export default function SettingsToggleGroup({ settingsKey, title, subtitle, sections, defaults, initial }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, boolean>>(() => ({ ...defaults, ...(initial ?? {}) }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggle(key: string) {
    setValues(v => ({ ...v, [key]: !v[key] }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingsKey, value: values }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save settings')
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-3xl">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{section.title}</p>
            )}
            <div className="space-y-2.5">
              {section.toggles.map(t => (
                <label key={t.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!values[t.key]}
                    onChange={() => toggle(t.key)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-studio-600 focus:ring-studio-500"
                  />
                  <div>
                    <p className="text-sm text-gray-800">{t.label}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
        {saved && !saving && (
          <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
