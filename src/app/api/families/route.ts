import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { first_name, last_name, email, phone } = await req.json()

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'first_name, last_name, and email are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '!A1',
    email_confirm: true,
    user_metadata: { first_name, last_name, role: 'parent' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Explicit upsert in case the trigger didn't fire or partially failed
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    first_name,
    last_name,
    phone: phone ?? null,
    role: 'parent',
  }, { onConflict: 'id' })

  if (profileError) {
    // Auth user was created — clean up so we don't leave a dangling auth record
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ id: userId })
}
