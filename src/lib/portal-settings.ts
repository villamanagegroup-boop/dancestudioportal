import { createAdminClient } from '@/lib/supabase/admin'

// Mirrors PARENT_PORTAL_DEFAULTS in SettingsPanel — the source of truth for what
// a toggle does when it has never been saved.
export const PARENT_PORTAL_DEFAULTS: Record<string, boolean> = {
  allow_account_creation: true, show_classes: true, show_camps: true, show_parties: true,
  show_tuition: true, show_instructors: true, show_class_descriptions: true,
  show_student_images: true, hide_medical_info: true, show_attendance: true, allow_absence_requests: true,
  allow_request_full: true, allow_waitlist: true, allow_trial: true, allow_transfer: true,
  allow_drop: true, auto_approve: false, auto_charge_first_tuition: false,
  camp_count_against_openings: true, camp_allow_full: true, camp_email_notification: true,
  camp_restrict_start_date: false,
  filter_age: true, filter_gender: true, filter_program: true, filter_session: true,
  filter_day: true, filter_level: true, filter_instructor: true, filter_openings: true, filter_search: true,
}

export type ParentPortalSettings = Record<string, boolean>

// Saved toggles merged over the defaults. Reads the studio_settings row that the
// admin Settings → Parent Portal tab writes.
export async function getParentPortalSettings(): Promise<ParentPortalSettings> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('studio_settings').select('value').eq('key', 'parent_portal').maybeSingle()
    const saved = (data?.value as Record<string, boolean> | null) ?? {}
    return { ...PARENT_PORTAL_DEFAULTS, ...saved }
  } catch {
    return { ...PARENT_PORTAL_DEFAULTS }
  }
}
