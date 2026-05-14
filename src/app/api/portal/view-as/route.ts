import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'portal_view_as'

// Sets/clears which person an admin (or dev-bypass) is previewing a portal as.
export async function POST(req: NextRequest) {
  const { kind, id } = await req.json()
  if (kind !== 'g' && kind !== 'i') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  // Only admins or the no-session dev bypass may preview.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
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
