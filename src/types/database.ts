export type UserRole = 'admin' | 'instructor' | 'parent' | 'student'
export type EnrollmentStatus = 'active' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'waived'
export type ClassLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels' | 'pre_dance'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type InvoiceType = 'tuition' | 'registration' | 'costume' | 'recital' | 'retail' | 'other'
export type CommunicationType = 'email' | 'sms' | 'announcement' | 'reminder'

export interface Profile {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  photo_url: string | null
  medical_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface GuardianStudent {
  id: string
  guardian_id: string
  student_id: string
  relationship: string
  is_primary: boolean
}

export interface Instructor {
  id: string
  profile_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  bio: string | null
  specialties: string[] | null
  certifications: Record<string, unknown>[]
  background_check_date: string | null
  background_check_expires: string | null
  pay_rate: number | null
  pay_type: string
  active: boolean
  created_at: string
}

export interface Room {
  id: string
  name: string
  capacity: number | null
  floor_type: string | null
  has_mirrors: boolean
  has_barres: boolean
  notes: string | null
  active: boolean
}

export interface ClassType {
  id: string
  name: string
  style: string
  level: ClassLevel
  min_age: number | null
  max_age: number | null
  description: string | null
  color: string
  active: boolean
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  registration_opens: string | null
  registration_closes: string | null
  tuition_due_day: number
  active: boolean
  created_at: string
}

export interface Class {
  id: string
  season_id: string
  class_type_id: string
  instructor_id: string | null
  room_id: string | null
  name: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  max_students: number
  monthly_tuition: number
  registration_fee: number
  stripe_price_id: string | null
  active: boolean
  created_at: string
  // joined
  instructor?: Instructor
  room?: Room
  class_type?: ClassType
  season?: Season
  enrolled_count?: number
}

export interface Enrollment {
  id: string
  student_id: string
  class_id: string
  season_id: string
  status: EnrollmentStatus
  enrolled_at: string
  dropped_at: string | null
  waitlist_position: number | null
  notes: string | null
  stripe_subscription_id: string | null
  // joined
  student?: Student
  class?: Class
  season?: Season
}

export interface ClassSession {
  id: string
  class_id: string
  session_date: string
  cancelled: boolean
  cancel_reason: string | null
  makeup_offered: boolean
  notes: string | null
}

export interface Attendance {
  id: string
  session_id: string
  student_id: string
  present: boolean
  is_makeup: boolean
  checked_in_at: string | null
  notes: string | null
  student?: Student
}

export interface PaymentMethod {
  id: string
  guardian_id: string
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  last_four: string | null
  card_brand: string | null
  is_default: boolean
  created_at: string
}

export interface Invoice {
  id: string
  guardian_id: string
  student_id: string | null
  enrollment_id: string | null
  invoice_type: InvoiceType
  description: string
  amount: number
  due_date: string | null
  paid_at: string | null
  status: PaymentStatus
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  notes: string | null
  created_at: string
  // joined
  guardian?: Profile
  student?: Student
}

export interface Payment {
  id: string
  invoice_id: string | null
  guardian_id: string
  amount: number
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  payment_method_last_four: string | null
  paid_at: string
  refunded_at: string | null
  refund_amount: number | null
  notes: string | null
}

export interface Document {
  id: string
  student_id: string | null
  guardian_id: string | null
  title: string
  document_type: string
  storage_path: string | null
  signed_at: string | null
  expires_at: string | null
  required: boolean
  season_id: string | null
  created_at: string
}

export interface Communication {
  id: string
  sender_id: string | null
  subject: string | null
  body: string
  comm_type: CommunicationType
  target_all: boolean
  target_class_id: string | null
  sent_at: string | null
  scheduled_for: string | null
  created_at: string
  sender?: Profile
  recipient_count?: number
}

export interface CommunicationRecipient {
  id: string
  communication_id: string
  guardian_id: string | null
  delivered_at: string | null
  opened_at: string | null
  error: string | null
}
