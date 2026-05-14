'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { classSchema, type ClassFormData } from '@/lib/validations/class'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  instructors: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  classTypes: { id: string; name: string; style: string }[]
  seasons: { id: string; name: string }[]
}

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

export default function ClassFormModal({ onClose, instructors, rooms, classTypes, seasons }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema) as any,
    defaultValues: { max_students: 15, registration_fee: 0 },
  })

  async function onSubmit(data: ClassFormData) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save class')
      }
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Add Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input {...register('name')} className={fieldClass} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season *</label>
              <select {...register('season_id')} className={fieldClass}>
                <option value="">Select...</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.season_id && <p className="text-red-500 text-xs mt-1">{errors.season_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Type *</label>
              <select {...register('class_type_id')} className={fieldClass}>
                <option value="">Select...</option>
                {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
              </select>
              {errors.class_type_id && <p className="text-red-500 text-xs mt-1">{errors.class_type_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select {...register('instructor_id')} className={fieldClass}>
                <option value="">None</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select {...register('room_id')} className={fieldClass}>
                <option value="">None</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week *</label>
            <select {...register('day_of_week')} className={fieldClass}>
              <option value="">Select...</option>
              {DAYS.map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
            {errors.day_of_week && <p className="text-red-500 text-xs mt-1">{errors.day_of_week.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input type="time" {...register('start_time')} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input type="time" {...register('end_time')} className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
              <input type="number" {...register('max_students')} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Tuition ($)</label>
              <input type="number" step="0.01" {...register('monthly_tuition')} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reg. Fee ($)</label>
              <input type="number" step="0.01" {...register('registration_fee')} className={fieldClass} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
