// Per-entity configuration for the CSV importer. Defines required + optional
// columns, validators, and how rows are transformed before insert. The server
// route at /api/import uses these to validate and resolve FKs.

export type EntityKey =
  | 'families' | 'students' | 'classes' | 'enrollments'
  | 'camps' | 'camp_registrations' | 'invoices' | 'payments'

export interface ColumnSpec {
  /** Canonical column name (what we want). */
  key: string
  /** Human label shown in the UI. */
  label: string
  /** Accepted CSV header aliases (case-insensitive). */
  aliases?: string[]
  required?: boolean
  /** Brief hint shown under the field. */
  hint?: string
}

export interface EntityConfig {
  key: EntityKey
  label: string
  description: string
  columns: ColumnSpec[]
}

export const ENTITY_CONFIGS: Record<EntityKey, EntityConfig> = {
  families: {
    key: 'families',
    label: 'Families (parents)',
    description: 'Imports parent accounts. Creates auth users with a temporary password (parents reset on first login via Forgot Password).',
    columns: [
      { key: 'first_name', label: 'First name', aliases: ['first', 'firstname', 'parent_first', 'guardian_first'], required: true },
      { key: 'last_name', label: 'Last name', aliases: ['last', 'lastname', 'parent_last', 'guardian_last'], required: true },
      { key: 'email', label: 'Email', aliases: ['email_address', 'parent_email'], required: true, hint: 'Used as the login. Must be unique.' },
      { key: 'phone', label: 'Phone', aliases: ['mobile', 'phone_number'] },
      { key: 'address_street', label: 'Street', aliases: ['address', 'street'] },
      { key: 'address_city', label: 'City', aliases: ['city'] },
      { key: 'address_state', label: 'State', aliases: ['state'] },
      { key: 'address_zip', label: 'ZIP', aliases: ['zip', 'zipcode', 'postal_code'] },
    ],
  },
  students: {
    key: 'students',
    label: 'Students (dancers)',
    description: 'Imports dancer records. Optionally links each to a family by parent_email.',
    columns: [
      { key: 'first_name', label: 'First name', aliases: ['first', 'firstname', 'student_first', 'dancer_first'], required: true },
      { key: 'last_name', label: 'Last name', aliases: ['last', 'lastname', 'student_last', 'dancer_last'], required: true },
      { key: 'date_of_birth', label: 'Date of birth', aliases: ['dob', 'birthdate', 'birthday'], required: true, hint: 'YYYY-MM-DD or MM/DD/YYYY.' },
      { key: 'gender', label: 'Gender', aliases: ['sex'] },
      { key: 'medical_notes', label: 'Medical notes', aliases: ['medical', 'allergies'] },
      { key: 'emergency_contact_name', label: 'Emergency contact name', aliases: ['ec_name', 'emergency_name'] },
      { key: 'emergency_contact_phone', label: 'Emergency contact phone', aliases: ['ec_phone', 'emergency_phone'] },
      { key: 'parent_email', label: 'Parent email (for linking)', aliases: ['guardian_email', 'family_email'], hint: 'If set + matches an existing parent, the dancer is linked.' },
    ],
  },
  classes: {
    key: 'classes',
    label: 'Classes',
    description: 'Imports recurring class offerings.',
    columns: [
      { key: 'name', label: 'Class name', aliases: ['class_name', 'title'], required: true },
      { key: 'day_of_week', label: 'Day of week', aliases: ['day', 'dow'], required: true, hint: 'monday / tuesday / … / sunday' },
      { key: 'start_time', label: 'Start time', aliases: ['start', 'begin'], required: true, hint: 'HH:MM (24-hour) or 7:00pm' },
      { key: 'end_time', label: 'End time', aliases: ['end', 'finish'], required: true, hint: 'HH:MM (24-hour) or 8:00pm' },
      { key: 'monthly_tuition', label: 'Monthly tuition', aliases: ['tuition', 'price', 'monthly_price'], hint: 'Number, e.g. 95 or 95.00' },
      { key: 'max_students', label: 'Max students', aliases: ['capacity', 'max_capacity'] },
      { key: 'age_min', label: 'Min age', aliases: ['min_age'] },
      { key: 'age_max', label: 'Max age', aliases: ['max_age'] },
      { key: 'instructor_email', label: 'Instructor email (for linking)', aliases: ['instructor', 'teacher_email'], hint: 'If set + matches an instructor, assigns them.' },
    ],
  },
  enrollments: {
    key: 'enrollments',
    label: 'Enrollments (student ↔ class)',
    description: 'Links existing students to existing classes. Both must already be imported.',
    columns: [
      { key: 'student_first_name', label: 'Student first', aliases: ['student_first', 'dancer_first'], required: true },
      { key: 'student_last_name', label: 'Student last', aliases: ['student_last', 'dancer_last'], required: true },
      { key: 'student_dob', label: 'Student DOB', aliases: ['dob', 'birthdate'], required: true, hint: 'Used with name to disambiguate.' },
      { key: 'class_name', label: 'Class name', aliases: ['class', 'name'], required: true },
      { key: 'enrolled_at', label: 'Enrolled date', aliases: ['start_date', 'enrollment_date'], hint: 'Defaults to today.' },
      { key: 'status', label: 'Status', aliases: ['enrollment_status'], hint: 'active (default), waitlisted, dropped' },
    ],
  },
  camps: {
    key: 'camps',
    label: 'Camps',
    description: 'Imports camp offerings (one-time / multi-day programs).',
    columns: [
      { key: 'name', label: 'Camp name', aliases: ['camp_name', 'title'], required: true },
      { key: 'description', label: 'Description', aliases: ['desc'] },
      { key: 'start_date', label: 'Start date', aliases: ['begin_date'], required: true, hint: 'YYYY-MM-DD' },
      { key: 'end_date', label: 'End date', aliases: ['finish_date'], required: true },
      { key: 'start_time', label: 'Start time', aliases: ['start'] },
      { key: 'end_time', label: 'End time', aliases: ['end'] },
      { key: 'price', label: 'Price', aliases: ['cost', 'fee'], required: true },
      { key: 'max_capacity', label: 'Max capacity', aliases: ['capacity', 'spots'] },
      { key: 'age_min', label: 'Min age', aliases: ['min_age'] },
      { key: 'age_max', label: 'Max age', aliases: ['max_age'] },
    ],
  },
  camp_registrations: {
    key: 'camp_registrations',
    label: 'Camp registrations',
    description: 'Links existing students to existing camps. Both must already be imported.',
    columns: [
      { key: 'camp_name', label: 'Camp name', aliases: ['camp'], required: true },
      { key: 'student_first_name', label: 'Student first', aliases: ['student_first'], required: true },
      { key: 'student_last_name', label: 'Student last', aliases: ['student_last'], required: true },
      { key: 'student_dob', label: 'Student DOB', aliases: ['dob', 'birthdate'], required: true },
      { key: 'status', label: 'Status', aliases: ['registration_status'], hint: 'registered (default), cancelled' },
    ],
  },
  invoices: {
    key: 'invoices',
    label: 'Invoices (historical)',
    description: 'Imports past invoices. Each row needs a parent_email to link to a family.',
    columns: [
      { key: 'parent_email', label: 'Parent email', aliases: ['email', 'guardian_email'], required: true },
      { key: 'description', label: 'Description', aliases: ['memo', 'item'], required: true },
      { key: 'amount', label: 'Amount', aliases: ['total', 'price'], required: true },
      { key: 'invoice_type', label: 'Type', aliases: ['type'], hint: 'tuition, camp, party, drop_in, late_fee, other' },
      { key: 'status', label: 'Status', aliases: ['payment_status'], hint: 'pending, paid, failed, refunded' },
      { key: 'due_date', label: 'Due date', aliases: ['due'] },
      { key: 'paid_at', label: 'Paid date', aliases: ['paid_date'], hint: 'Required if status=paid' },
      { key: 'created_at', label: 'Created date', aliases: ['date', 'invoice_date'] },
    ],
  },
  payments: {
    key: 'payments',
    label: 'Payments (historical)',
    description: 'Imports past payment records. Each row needs a parent_email.',
    columns: [
      { key: 'parent_email', label: 'Parent email', aliases: ['email', 'guardian_email'], required: true },
      { key: 'amount', label: 'Amount', aliases: ['total'], required: true },
      { key: 'paid_at', label: 'Paid date', aliases: ['date', 'payment_date'], required: true },
      { key: 'payment_method_last_four', label: 'Last 4', aliases: ['last4', 'card_last_four'] },
    ],
  },
}

export const ENTITY_ORDER: EntityKey[] = [
  'families', 'students', 'classes', 'enrollments',
  'camps', 'camp_registrations', 'invoices', 'payments',
]

/** Auto-map CSV headers to canonical columns by checking aliases. */
export function autoMapHeaders(
  config: EntityConfig,
  headers: string[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const col of config.columns) {
    const candidates = [col.key.toLowerCase(), ...(col.aliases ?? []).map(a => a.toLowerCase())]
    const match = headers.find(h => candidates.includes(h.trim().toLowerCase()))
    result[col.key] = match ?? null
  }
  return result
}
