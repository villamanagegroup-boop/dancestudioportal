export type ToastKind = 'success' | 'error' | 'info'

export interface ToastDetail {
  text: string
  kind?: ToastKind
}

export function showToast(text: string, kind: ToastKind = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('app:toast', { detail: { text, kind } }))
}
