// Staff roles & permissions.
// The iClassPro reference had ~200 toggles; this is the consolidated set that maps
// to the modules this app actually has. Each permission is none / view / full.

export type PermLevel = 'none' | 'view' | 'full'
export type StaffRole = 'owner' | 'manager' | 'front_desk' | 'instructor'

export const PERM_LEVELS: PermLevel[] = ['none', 'view', 'full']

export const PERM_LEVEL_LABEL: Record<PermLevel, string> = {
  none: 'None',
  view: 'View',
  full: 'Full',
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  front_desk: 'Front Desk',
  instructor: 'Instructor',
}

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: 'Full access to everything, including roles & permissions. The super admin.',
  manager: 'Runs day-to-day operations — full access except assigning roles & permissions.',
  front_desk: 'Front-desk staff — families, enrollments, payments, and scheduling. No settings or staff management.',
  instructor: 'Teaching staff — their classes, attendance, evaluations, and the time clock.',
}

export const STAFF_ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'instructor']

export interface PermissionDef {
  key: string
  label: string
  description?: string
}
export interface PermissionCategory {
  name: string
  permissions: PermissionDef[]
}

export const PERMISSION_CATALOG: PermissionCategory[] = [
  {
    name: 'Portal Access',
    permissions: [
      { key: 'staff_portal', label: 'Staff Portal', description: 'Sign in to the instructor portal' },
      { key: 'admin_console', label: 'Admin Console', description: 'Access the full studio management app' },
    ],
  },
  {
    name: 'People',
    permissions: [
      { key: 'families', label: 'Families' },
      { key: 'students', label: 'Students' },
      { key: 'partners', label: 'Partners' },
      { key: 'delete_people', label: 'Delete Families & Students', description: 'Permanently remove family or student records' },
    ],
  },
  {
    name: 'Activities',
    permissions: [
      { key: 'classes', label: 'Classes' },
      { key: 'camps', label: 'Camps' },
      { key: 'enrollments', label: 'Enrollments & Waitlists' },
      { key: 'attendance', label: 'Attendance & Check-In' },
      { key: 'evaluations', label: 'Skill Evaluations' },
      { key: 'delete_activities', label: 'Delete Classes, Camps & Enrollments' },
    ],
  },
  {
    name: 'Scheduling',
    permissions: [
      { key: 'calendar', label: 'Calendar' },
      { key: 'events', label: 'Events (Parties & Recitals)' },
      { key: 'bookings', label: 'Bookings (Rentals & Lessons)' },
    ],
  },
  {
    name: 'Billing & Finance',
    permissions: [
      { key: 'billing', label: 'Invoices & Billing' },
      { key: 'payments', label: 'Record Payments' },
      { key: 'refunds', label: 'Issue Refunds', description: 'Refund or void payments' },
      { key: 'reports', label: 'Reports & Analytics' },
    ],
  },
  {
    name: 'Communications',
    permissions: [
      { key: 'communications', label: 'Communications', description: 'Send messages, announcements, and reminders' },
    ],
  },
  {
    name: 'Administration',
    permissions: [
      { key: 'staff', label: 'Staff Management' },
      { key: 'timeclock', label: 'Time Clock' },
      { key: 'settings', label: 'Studio Settings' },
      { key: 'permissions', label: 'Roles & Permissions', description: 'Assign roles and customize staff permissions' },
    ],
  },
]

export const PERMISSION_KEYS = PERMISSION_CATALOG.flatMap(c => c.permissions.map(p => p.key))

function build(spec: Record<string, PermLevel>, fallback: PermLevel): Record<string, PermLevel> {
  const out: Record<string, PermLevel> = {}
  for (const key of PERMISSION_KEYS) out[key] = spec[key] ?? fallback
  return out
}

export const ROLE_DEFAULTS: Record<StaffRole, Record<string, PermLevel>> = {
  owner: build({}, 'full'),
  manager: build({ permissions: 'none' }, 'full'),
  front_desk: build(
    {
      staff_portal: 'full', admin_console: 'full',
      families: 'full', students: 'full', partners: 'view', delete_people: 'none',
      classes: 'view', camps: 'view', enrollments: 'full', attendance: 'full',
      evaluations: 'none', delete_activities: 'none',
      calendar: 'full', events: 'full', bookings: 'full',
      billing: 'full', payments: 'full', refunds: 'none', reports: 'view',
      communications: 'full',
      staff: 'none', timeclock: 'view', settings: 'none', permissions: 'none',
    },
    'none',
  ),
  instructor: build(
    {
      staff_portal: 'full', admin_console: 'none',
      families: 'view', students: 'view', partners: 'none', delete_people: 'none',
      classes: 'view', camps: 'view', enrollments: 'view', attendance: 'full',
      evaluations: 'full', delete_activities: 'none',
      calendar: 'view', events: 'none', bookings: 'none',
      billing: 'none', payments: 'none', refunds: 'none', reports: 'none',
      communications: 'view',
      staff: 'none', timeclock: 'full', settings: 'none', permissions: 'none',
    },
    'none',
  ),
}

export function isStaffRole(v: unknown): v is StaffRole {
  return v === 'owner' || v === 'manager' || v === 'front_desk' || v === 'instructor'
}

/** Role default merged with the staff member's per-permission overrides. */
export function effectivePermissions(
  role: StaffRole,
  overrides: Record<string, PermLevel> = {},
): Record<string, PermLevel> {
  const base = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.instructor
  return { ...base, ...overrides }
}

export function getPermission(
  role: StaffRole,
  overrides: Record<string, PermLevel> | null | undefined,
  key: string,
): PermLevel {
  const o = overrides ?? {}
  if (o[key]) return o[key]
  return (ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.instructor)[key] ?? 'none'
}
