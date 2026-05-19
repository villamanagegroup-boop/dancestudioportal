'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)
  async function handleClick() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      style={{
        padding: '8px 14px', fontSize: 13, fontWeight: 500,
        background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6,
        cursor: busy ? 'wait' : 'pointer',
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
