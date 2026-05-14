'use client'

import { useEffect, useState } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import type { ToastDetail, ToastKind } from '@/lib/toast'

interface Item { id: string; text: string; kind: ToastKind }

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <Check size={14} style={{ color: '#4ade80' }} />,
  error:   <AlertCircle size={14} style={{ color: '#fb7185' }} />,
  info:    <Info size={14} style={{ color: 'var(--grad-4)' }} />,
}

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail
      const id = Math.random().toString(36).slice(2)
      setItems(items => [...items, { id, text: detail.text, kind: detail.kind ?? 'success' }])
      setTimeout(() => setItems(items => items.filter(i => i.id !== id)), 2400)
    }
    window.addEventListener('app:toast', onToast)
    return () => window.removeEventListener('app:toast', onToast)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="toast-wrap" aria-live="polite">
      {items.map(t => (
        <div className="toast" key={t.id}>
          {ICON[t.kind]}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
