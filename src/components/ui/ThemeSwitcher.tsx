'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Palette, Sun, Moon, Check } from 'lucide-react'

type Theme = 'light' | 'dark'
type PaletteId = 'aurora' | 'iris' | 'azure' | 'orchid'

const PALETTES: { id: PaletteId; label: string; bg: string }[] = [
  { id: 'aurora', label: 'Aurora', bg: 'linear-gradient(135deg, #2dd4bf, #06b6d4 55%, #8b5cf6)' },
  { id: 'iris',   label: 'Iris',   bg: 'linear-gradient(135deg, #7c5cff, #4f7bff 55%, #ff6bd6)' },
  { id: 'azure',  label: 'Azure',  bg: 'linear-gradient(135deg, #4f7bff, #28c0ff 55%, #a6f1ff)' },
  { id: 'orchid', label: 'Orchid', bg: 'linear-gradient(135deg, #a855f7, #ec4899 55%, #f0abfc)' },
]

const STORAGE_THEME = 'cc-theme'
const STORAGE_PALETTE = 'cc-palette'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light')
  const [palette, setPalette] = useState<PaletteId>('aurora')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  // Read persisted values once mounted
  useEffect(() => {
    setMounted(true)
    const savedTheme = (localStorage.getItem(STORAGE_THEME) as Theme | null) ?? 'light'
    const savedPalette = (localStorage.getItem(STORAGE_PALETTE) as PaletteId | null) ?? 'aurora'
    setTheme(savedTheme)
    setPalette(savedPalette)
    document.documentElement.dataset.theme = savedTheme
    document.documentElement.dataset.palette = savedPalette
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_THEME, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.palette = palette
    localStorage.setItem(STORAGE_PALETTE, palette)
  }, [palette])

  // Position dropdown beneath the trigger button
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  // Click-outside to close — works across the portal
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (popRef.current?.contains(target)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        onClick={() => setOpen(o => !o)}
        title="Theme & palette"
        aria-expanded={open}
      >
        <Palette size={16} />
      </button>
      {mounted && open && createPortal(
        <div
          ref={popRef}
          className="glass-strong"
          style={{
            position: 'fixed',
            top: position.top,
            right: position.right,
            zIndex: 1000,
            minWidth: 260,
            padding: 14,
            borderRadius: 16,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>Theme</div>
          <div className="role-switch" style={{ width: '100%' }}>
            <button
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
              style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', gap: 6, alignItems: 'center' }}
            >
              <Sun size={13} /> Light
            </button>
            <button
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
              style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', gap: 6, alignItems: 'center' }}
            >
              <Moon size={13} /> Dark
            </button>
          </div>

          <div className="eyebrow" style={{ marginTop: 14, marginBottom: 8 }}>Palette</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                title={p.label}
                style={{
                  position: 'relative',
                  border: palette === p.id ? '2px solid rgba(0,0,0,.65)' : '1px solid rgba(0,0,0,.10)',
                  borderRadius: 10,
                  height: 44,
                  padding: 0,
                  cursor: 'pointer',
                  background: p.bg,
                  boxShadow: palette === p.id
                    ? '0 0 0 2px white inset, 0 2px 6px rgba(0,0,0,.18)'
                    : '0 1px 3px rgba(0,0,0,.08)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 0.04,
                  textShadow: '0 1px 2px rgba(0,0,0,.3)',
                }}
              >
                {p.label}
                {palette === p.id && (
                  <span style={{ position: 'absolute', top: 4, right: 4, background: 'white', borderRadius: 999, padding: 2 }}>
                    <Check size={10} style={{ color: 'var(--ink-1)' }} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
