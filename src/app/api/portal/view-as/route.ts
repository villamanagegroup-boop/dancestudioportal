import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'portal_view_as'

// Sets/clears which person an admin/owner (or dev-bypass) is previewing a portal as.
export async function POST(req: NextRequest) {
  const { kind, id } = await req.json()
  if (kind !== 'g' && kind !== 'i' && kind !== 'p') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  // Only admins, the studio owner, or the no-session dev bypass may preview.
  // Resolve via the admin client (RLS bypass) so an admin/owner is never
  // misclassified by a missing profiles self-read policy.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createAdminClient()
    const [{ data: profile }, { data: ownerRow }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('instructors').select('id').eq('profile_id', user.id).eq('staff_role', 'owner').maybeSingle(),
    ])
    if (profile?.role !== 'admin' && !ownerRow) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const cookieStore = await cookies()
  if (id) {
    cookieStore.set(COOKIE, `${kind}:${id}`, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
  } else {
    cookieStore.delete(COOKIE)
  }

  return NextResponse.json({ ok: true })
}
