import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isNaN(d.getTime())) return '—'
  return format(d, 'MMM d, yyyy')
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function getAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  const birth = parseISO(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Display helper: "8 yrs", "Age 8", etc. Returns the fallback when no/invalid dob.
export function formatAge(dob: string | null | undefined, suffix = ' yrs', fallback = '—'): string {
  const age = getAgeFromDob(dob)
  return age == null ? fallback : `${age}${suffix}`
}

export function getEnrollmentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    waitlisted: 'bg-yellow-100 text-yellow-800',
    dropped: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-blue-100 text-blue-800',
    waived: 'bg-gray-100 text-gray-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}
