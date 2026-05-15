// Reports library catalog.
// Each report has an id, category, title, description, and status.
// "available" reports have a matching runner in src/lib/report-runners.ts.
// "coming_soon" reports are listed for discoverability but require features
// that aren't built yet (POS, punch passes, policy agreements, mailing
// addresses, time-clock entries, promo codes, etc.).

export type ReportStatus = 'available' | 'coming_soon'
export type ReportCategory =
  | 'Family' | 'Student' | 'Class' | 'Camp' | 'Staff' | 'Financial' | 'Marketing'

export interface ReportDef {
  id: string
  category: ReportCategory
  title: string
  description: string
  status: ReportStatus
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  'Family', 'Student', 'Class', 'Camp', 'Staff', 'Financial', 'Marketing',
]

export const REPORT_CATALOG: ReportDef[] = [
  // FAMILY
  { id: 'FAM-1', category: 'Family', title: 'Family List', description: 'List of all families.', status: 'available' },
  { id: 'FAM-2', category: 'Family', title: 'Family Phonebook', description: 'Family contact information (phone + email).', status: 'available' },
  { id: 'FAM-3', category: 'Family', title: 'Family Email List', description: 'Email addresses of all families.', status: 'available' },
  { id: 'FAM-4', category: 'Family', title: 'Families Without Email', description: 'Families with no email on file.', status: 'available' },
  { id: 'FAM-5', category: 'Family', title: 'Families With Multiple Students', description: 'Families with more than one dancer.', status: 'available' },
  { id: 'FAM-6', category: 'Family', title: 'Family List by Postal/Zip Code', description: 'Families grouped by zip code.', status: 'coming_soon' },
  { id: 'FAM-7', category: 'Family', title: 'Enrollment by Postal/Zip Code', description: 'Enrollments grouped by family zip.', status: 'coming_soon' },
  { id: 'FAM-8', category: 'Family', title: 'Notes Report', description: 'All family notes.', status: 'coming_soon' },
  { id: 'FAM-9', category: 'Family', title: 'Policy Report', description: 'Family policy statuses.', status: 'coming_soon' },
  { id: 'FAM-10', category: 'Family', title: 'Family Mailing Labels', description: 'Avery 8160 mailing labels.', status: 'coming_soon' },
  { id: 'FAM-11', category: 'Family', title: 'Family Policy Agreement', description: 'Policy agreement statuses.', status: 'coming_soon' },
  { id: 'FAM-12', category: 'Family', title: 'Same Primary Emails for Login', description: 'Families sharing a primary email.', status: 'available' },
  { id: 'FAM-13', category: 'Family', title: 'Guardian User Access Report', description: 'Guardians with login access.', status: 'available' },
  { id: 'FAM-15', category: 'Family', title: 'Family Punch Pass Report', description: 'Family punch passes and usage.', status: 'coming_soon' },

  // STUDENT
  { id: 'STU-1', category: 'Student', title: 'Student List', description: 'List of all students.', status: 'available' },
  { id: 'STU-2', category: 'Student', title: 'Student Phonebook', description: 'Student contact information.', status: 'available' },
  { id: 'STU-3', category: 'Student', title: 'Student Birthday List', description: 'Upcoming dancer birthdays.', status: 'available' },
  { id: 'STU-4', category: 'Student', title: 'Student Anniversary List', description: 'Student studio anniversaries.', status: 'available' },
  { id: 'STU-5', category: 'Student', title: 'Student Insurable Age Groups', description: 'Student counts by insurable age range.', status: 'available' },
  { id: 'STU-6', category: 'Student', title: 'Notes Report', description: 'All student notes.', status: 'coming_soon' },
  { id: 'STU-7', category: 'Student', title: 'Student Mailing Labels', description: 'Avery 8160 mailing labels for students.', status: 'coming_soon' },
  { id: 'STU-10', category: 'Student', title: 'Student Policy Agreement', description: 'Student policy agreement statuses.', status: 'coming_soon' },
  { id: 'STU-11', category: 'Student', title: 'Student Policy', description: 'Student policies on file.', status: 'coming_soon' },
  { id: 'STU-14', category: 'Student', title: 'Makeups Report', description: 'Makeups, absences, and tokens by student.', status: 'coming_soon' },
  { id: 'STU-15', category: 'Student', title: 'Student Retention Report', description: 'Student retention between two date ranges.', status: 'coming_soon' },
  { id: 'STU-16', category: 'Student', title: 'Student Punch Pass Report', description: 'Student punch passes and usage.', status: 'coming_soon' },
  { id: 'STU-17', category: 'Student', title: 'Tuition Override Report', description: 'Custom tuition overrides.', status: 'coming_soon' },

  // CLASS
  { id: 'CLA-1', category: 'Class', title: 'Class List', description: 'List of all classes with schedule and enrollments.', status: 'available' },
  { id: 'CLA-2', category: 'Class', title: 'Customer Class List', description: 'Customer-facing list of available classes.', status: 'available' },
  { id: 'CLA-3', category: 'Class', title: 'Program Summary', description: 'Enrollment summary by program / class type.', status: 'available' },
  { id: 'CLA-4', category: 'Class', title: 'Roll Sheets', description: 'Printable roll sheets per class.', status: 'coming_soon' },
  { id: 'CLA-5', category: 'Class', title: 'Drop List', description: 'Dropped enrollments.', status: 'available' },
  { id: 'CLA-8', category: 'Class', title: 'Special Enrollments', description: 'Trial, makeup, and one-off enrollments.', status: 'coming_soon' },
  { id: 'CLA-9', category: 'Class', title: 'New Enrollments List', description: 'Enrollments created in the date range.', status: 'available' },
  { id: 'CLA-10', category: 'Class', title: 'Roll Sheet Labels', description: 'Mailing labels for class rosters.', status: 'coming_soon' },
  { id: 'CLA-11', category: 'Class', title: 'Class Roll Not Taken', description: 'Classes where attendance was not recorded.', status: 'coming_soon' },
  { id: 'CLA-12', category: 'Class', title: 'Absences Report', description: 'Absences across classes.', status: 'coming_soon' },
  { id: 'CLA-13', category: 'Class', title: 'Level Summary', description: 'Class summary grouped by level.', status: 'available' },
  { id: 'CLA-14', category: 'Class', title: 'Unexcused/Excused Absence Report', description: 'Absences split by reason.', status: 'coming_soon' },
  { id: 'CLA-15', category: 'Class', title: 'Expected Absences Report', description: 'Future planned absences.', status: 'coming_soon' },
  { id: 'CLA-18', category: 'Class', title: 'Class Retention Summary', description: 'Student retention within a class.', status: 'coming_soon' },
  { id: 'CLA-19', category: 'Class', title: 'Class Notes Report', description: 'Notes recorded against classes.', status: 'coming_soon' },
  { id: 'CLA-20', category: 'Class', title: 'First Enrollments Report', description: 'Each student’s first enrollment.', status: 'available' },
  { id: 'CLA-21', category: 'Class', title: 'Waitlist Report', description: 'Currently waitlisted enrollments.', status: 'available' },
  { id: 'CLA-22', category: 'Class', title: 'Drop Summary Report', description: 'Summary of drop reasons.', status: 'coming_soon' },

  // CAMP
  { id: 'CAM-1', category: 'Camp', title: 'Camp List', description: 'List of all camps.', status: 'available' },
  { id: 'CAM-2', category: 'Camp', title: 'Camp Enrollments Report', description: 'Track camp enrollments.', status: 'available' },
  { id: 'CAM-3', category: 'Camp', title: 'Camp Enrollment Block Report', description: 'Enrollments grouped by block.', status: 'coming_soon' },
  { id: 'CAM-4', category: 'Camp', title: 'Camp Sign In / Sign Out', description: 'Daily sign-in/out sheet.', status: 'coming_soon' },
  { id: 'CAM-5', category: 'Camp', title: 'Camp Unexcused/Excused Absences', description: 'Camp absences.', status: 'coming_soon' },
  { id: 'CAM-6', category: 'Camp', title: 'Camp Expected Absences', description: 'Future planned camp absences.', status: 'coming_soon' },
  { id: 'CAM-7', category: 'Camp', title: 'Camper Information Report', description: 'Demographics for each camp attendee.', status: 'available' },

  // STAFF
  { id: 'STA-1', category: 'Staff', title: 'Staff List', description: 'List of all staff.', status: 'available' },
  { id: 'STA-2', category: 'Staff', title: 'Staff Phone Book', description: 'Phone list for staff.', status: 'available' },
  { id: 'STA-3', category: 'Staff', title: 'Staff Schedule', description: 'Weekly schedule per instructor.', status: 'available' },
  { id: 'STA-4', category: 'Staff', title: 'Notes Report', description: 'Notes recorded against staff.', status: 'coming_soon' },
  { id: 'STA-5', category: 'Staff', title: 'Staff Mailing Labels', description: 'Avery 8160 labels for staff.', status: 'coming_soon' },
  { id: 'STA-6', category: 'Staff', title: 'Time Clock Entries', description: 'Clock-in / clock-out entries.', status: 'coming_soon' },
  { id: 'STA-7', category: 'Staff', title: 'Time Clock Adjustments', description: 'Manual time-clock adjustments.', status: 'coming_soon' },
  { id: 'STA-8', category: 'Staff', title: 'Instructor Roster Report', description: 'Roster organized by instructor.', status: 'available' },
  { id: 'STA-9', category: 'Staff', title: 'Class / Camp Roster Report', description: 'Roster organized by class or camp.', status: 'available' },
  { id: 'STA-10', category: 'Staff', title: 'Instructor Retention Report', description: 'Student retention per instructor.', status: 'coming_soon' },
  { id: 'STA-11', category: 'Staff', title: 'Instructor Absences & Substitutions', description: 'Absences and substitutes.', status: 'coming_soon' },
  { id: 'STA-12', category: 'Staff', title: 'Instructor Schedule Conflict Report', description: 'Overlapping instructor assignments.', status: 'available' },
  { id: 'STA-15', category: 'Staff', title: 'Staff Without Email', description: 'Staff missing an email address.', status: 'available' },
  { id: 'STA-16', category: 'Staff', title: 'Staff With Duplicate Emails', description: 'Staff sharing an email address.', status: 'available' },

  // FINANCIAL
  { id: 'FIN-1', category: 'Financial', title: 'Aged Accounts Report', description: 'Families with outstanding charges, aged.', status: 'available' },
  { id: 'FIN-2', category: 'Financial', title: 'Bank Deposit Report', description: 'Payments grouped by payment method.', status: 'coming_soon' },
  { id: 'FIN-4', category: 'Financial', title: 'Program Deposit Split', description: 'Deposits split by program / category.', status: 'coming_soon' },
  { id: 'FIN-6', category: 'Financial', title: 'Category List Report', description: 'List of charge categories in use.', status: 'available' },
  { id: 'FIN-7', category: 'Financial', title: 'Statements', description: 'Per-family statement.', status: 'available' },
  { id: 'FIN-8', category: 'Financial', title: 'Credit Card Splits', description: 'Credit-card revenue by type / program.', status: 'coming_soon' },
  { id: 'FIN-9', category: 'Financial', title: 'Recurring Billing Report', description: 'Families with autopay configured.', status: 'coming_soon' },
  { id: 'FIN-11', category: 'Financial', title: 'Consolidated Tax Report', description: 'Tax collected over a time period.', status: 'coming_soon' },
  { id: 'FIN-12', category: 'Financial', title: 'Families With Unapplied Credit Balances', description: 'Credits not yet applied to charges.', status: 'coming_soon' },
  { id: 'FIN-13', category: 'Financial', title: 'Students Enrolled But Not Charged', description: 'Active enrollments without an invoice.', status: 'available' },
  { id: 'FIN-14', category: 'Financial', title: 'Families Applied Payment Summary', description: 'Summary of how payments were applied.', status: 'coming_soon' },
  { id: 'FIN-15', category: 'Financial', title: 'Family Annual Total Receipts', description: 'Year-to-date receipts per family.', status: 'available' },
  { id: 'FIN-16', category: 'Financial', title: 'Tax Reconciliation Report', description: 'Tax reconciliation by program.', status: 'coming_soon' },
  { id: 'FIN-18', category: 'Financial', title: 'Period Summary Report', description: 'Enrollments and payments by period.', status: 'available' },
  { id: 'FIN-19', category: 'Financial', title: 'Point of Sale: Sales', description: 'POS transactions over a date range.', status: 'coming_soon' },
  { id: 'FIN-20', category: 'Financial', title: 'Point of Sale: Inventory on Hand', description: 'POS inventory on hand.', status: 'coming_soon' },
  { id: 'FIN-21', category: 'Financial', title: 'Payments By Shift Report', description: 'Payments entered by staff member by day.', status: 'coming_soon' },
  { id: 'FIN-23', category: 'Financial', title: 'Returned Payments Report', description: 'Returned / NSF payments.', status: 'available' },
  { id: 'FIN-24', category: 'Financial', title: 'Gateway Transactions Report', description: 'Historical gateway transactions.', status: 'coming_soon' },
  { id: 'FIN-25', category: 'Financial', title: 'Appointment Revenue Report', description: 'Revenue from private appointments.', status: 'coming_soon' },

  // MARKETING
  { id: 'MAR-1', category: 'Marketing', title: 'How You Heard Summary', description: 'Summary of referral sources.', status: 'coming_soon' },
  { id: 'MAR-2', category: 'Marketing', title: 'Promo Code Report', description: 'Promo codes used within a date range.', status: 'coming_soon' },
]

export function findReport(id: string): ReportDef | undefined {
  return REPORT_CATALOG.find(r => r.id === id)
}
