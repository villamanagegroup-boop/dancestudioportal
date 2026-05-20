'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'

/**
 * Right-side slide-over drawer. Renders into document.body (via Portal) so
 * it sits on top of everything regardless of ancestor stacking contexts.
 * Slides in from the right with a dimmed backdrop; clicking the backdrop
 * or the X closes it (with a slide-out animation).
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
    setShown(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setShown(false)
    setTimeout(onClose, 200)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100]">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute top-0 right-0 h-full bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${shown ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ width: '100%', maxWidth: width }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </Portal>
  )
}
