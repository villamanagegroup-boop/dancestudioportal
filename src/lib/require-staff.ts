import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

type StaffOk = { ok: true; admin: SupabaseClient; userId: string }
type StaffFail = { ok: false; status: number; message: string }

/**
 * Gate an API route to studio staff: an admin, the owner, or an active
 * instructor. Role is read with the service-role client (RLS bypass) so a
 * missing profiles self-read policy can't misclassify a real admin/owner.
 * Returns the admin client to use for subsequent queries when ok.
 */
export async function requireStaff(): Promise<StaffOk | StaffFail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, message: 'Not signed in' }

  const admin = createAdminClient()
  const [{ data: prof }, { data: instr }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    admin.from('instructors').select('id').eq('profile_id', user.id).eq('active', true).maybeSingle(),
  ])

  // Admins, the owner (an instructors row with staff_role='owner'), and active
  // instructors are all staff.
  if (prof?.role !== 'admin' && !instr) {
    return { ok: false, status: 403, message: 'Staff access only' }
  }
  return { ok: true, admin, userId: user.id }
}
