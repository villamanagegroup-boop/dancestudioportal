'use client'

import { useState } from 'react'
import { X, GraduationCap, Tent, Sparkles, CalendarCheck, Users, Ban, Square, CalendarPlus } from 'lucide-react'
import ClassFormModal from '@/components/forms/ClassFormModal'
import CampFormModal from '@/components/forms/CampFormModal'
import PartyFormModal from '@/components/forms/PartyFormModal'
import BookingFormModal from '@/components/forms/BookingFormModal'
import CalendarEventModal from '@/components/forms/CalendarEventModal'

export interface SlotContext {
  date: string        // YYYY-MM-DD
  dayOfWeek: string   // lowercase day name
  time: string        // HH:MM
}

interface Props {
  onClose: () => void
  context: SlotContext
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: { id: string; name: string }[]
}

type Pick =
  | 'class' | 'camp' | 'party' | 'booking'
  | 'event' | 'meeting' | 'blackout' | 'placeholder'

const OPTIONS: { key: Pick; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'class', label: 'Class', desc: 'Recurring weekly class', icon: <GraduationCap size={18} /> },
  { key: 'camp', label: 'Camp / Workshop', desc: 'Multi-day camp or intensive', icon: <Tent size={18} /> },
  { key: 'party', label: 'Party / Event', desc: 'Birthday party or studio event', icon: <Sparkles size={18} /> },
  { key: 'booking', label: 'Booking', desc: 'Rental, private lesson, rehearsal', icon: <CalendarCheck size={18} /> },
  { key: 'meeting', label: 'Meeting', desc: 'Internal staff meeting', icon: <Users size={18} /> },
  { key: 'blackout', label: 'Blackout', desc: 'Studio closed / unavailable', icon: <Ban size={18} /> },
  { key: 'placeholder', label: 'Placeholder', desc: 'Hold a slot', icon: <Square size={18} /> },
  { key: 'event', label: 'Other Event', desc: 'Anything else on the calendar', icon: <CalendarPlus size={18} /> },
]

export default function CalendarCreateModal({ onClose, context, instructors, rooms, classTypes, seasons }: Props) {
  const [picked, setPicked] = useState<Pick | null>(null)

  if (picked === 'class') {
    return (
      <ClassFormModal
        onClose={onClose}
        instructors={instructors}
        rooms={rooms}
        classTypes={classTypes}
        seasons={seasons}
        defaults={{ day_of_week: context.dayOfWeek, start_time: context.time } as any}
      />
    )
  }
  if (picked === 'camp') {
    return (
      <CampFormModal
        onClose={onClose}
        instructors={instructors}
        rooms={rooms}
        defaults={{ start_date: context.date, start_time: context.time }}
      />
    )
  }
  if (picked === 'party') {
    return (
      <PartyFormModal
        onClose={onClose}
        rooms={rooms}
        defaults={{ event_date: context.date, start_time: context.time }}
      />
    )
  }
  if (picked === 'booking') {
    return (
      <BookingFormModal
        onClose={onClose}
        rooms={rooms}
        defaults={{ booking_date: context.date, start_time: context.time }}
      />
    )
  }
  if (picked === 'event' || picked === 'meeting' || picked === 'blackout' || picked === 'placeholder') {
    return (
      <CalendarEventModal
        onClose={onClose}
        rooms={rooms}
        defaults={{ start_date: context.date, start_time: context.time, event_type: picked }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add to calendar</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(context.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {' · '}{context.time}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setPicked(o.key)}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-150 text-left hover:border-studio-300 hover:bg-studio-50/50 transition-colors"
            >
              <span className="text-studio-600 mt-0.5">{o.icon}</span>
              <span>
                <span className="block text-sm font-medium text-gray-900">{o.label}</span>
                <span className="block text-xs text-gray-400">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
