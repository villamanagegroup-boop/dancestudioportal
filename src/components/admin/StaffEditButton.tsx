'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import StaffFormModal from '@/components/forms/StaffFormModal'

export default function StaffEditButton({ instructor }: { instructor: any }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Pencil size={14} /> Edit
      </button>
      {open && <StaffFormModal onClose={() => setOpen(false)} instructor={instructor} />}
    </>
  )
}
