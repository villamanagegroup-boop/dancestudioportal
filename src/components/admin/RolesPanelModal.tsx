'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import Portal from '@/components/Portal'
import RolesPanel from '@/components/admin/RolesPanel'

/**
 * A button that opens RolesPanel for a given profile in a modal — so an
 * admin can change/add roles for anyone from a list, without navigating
 * to a detail page.
 */
export default function RolesPanelModal({ profileId, label = 'Manage roles' }: { profileId: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Shield size={14} /> {label}
      </button>

      {open && (
        <Portal>
          <div role="dialog" aria-modal="true"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: '90%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <RolesPanel profileId={profileId} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setOpen(false)}
                  style={{ padding: '8px 14px', fontSize: 14, fontWeight: 600, background: 'white', border: '1px solid #d1d5db', borderRadius: 6 }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
