'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'

/**
 * Right-side slide-over drawer. Renders into document.body (via Portal) so
 * it sits on top of everything regardless of ancestor stacking contexts.
 * Uses inline-style transitions (not Tailwind utilities) so the slide
 * animation always plays, and a requestAnimationFrame to guarantee the
 * browser paints the closed state before transitioning to open.
 */
export default function SlideOver({
  title,
  onClose,
  children,
  width = 480,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setShown(false)
    setTimeout(onClose, 340)
  }

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
        {/* Backdrop */}
        <div
          onClick={handleClose}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            opacity: shown ? 1 : 0, transition: 'opacity 340ms ease',
          }}
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 0, right: 0, height: '100%',
            width: '100%', maxWidth: width,
            background: 'white', boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
            transform: shown ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)',
            transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid #f1f1f4', flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{title}</h2>
            <button onClick={handleClose} aria-label="Close"
              style={{ color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        </div>
      </div>
    </Portal>
  )
}
