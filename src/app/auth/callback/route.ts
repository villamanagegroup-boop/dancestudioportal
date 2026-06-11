import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth (and magic-link) callback. Supabase redirects here with a `code` after
// Google sign-in; we exchange it for a session cookie, then hand off to
// /post-login which routes the user by role.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Only allow same-site relative redirects to avoid an open-redirect. A bare
  // startsWith('/') is NOT enough: "//evil.com" (protocol-relative) and "/\evil"
  // both resolve to an external host. Require a single leading slash, then
  // resolve against our own origin and confirm the origin is unchanged.
  const nextParam = searchParams.get('next') ?? '/post-login'
  let next = '/post-login'
  if (nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')) {
    try {
      const resolved = new URL(nextParam, origin)
      if (resolved.origin === origin) next = resolved.pathname + resolved.search
    } catch {
      // keep the safe default
    }
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
