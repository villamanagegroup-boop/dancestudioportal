import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// API prefixes that must stay reachable without staff auth: public auth/signup,
// member self-service, payment flows + their external webhooks, and the
// secret-authenticated site intake webhook. Everything else under /api is
// staff-only (the admin data API).
const OPEN_API = [
  '/api/auth', '/api/portal', '/api/account',
  '/api/stripe', '/api/paypal', '/api/checkout',
  '/api/intake/from-site',
  '/api/contact', // public studio contact form (login screen)
  '/api/unsubscribe', // public mailing-list opt-out (self-secured by HMAC token)
]

// Member portal roots (their own entitlement checks below).
const MEMBER_PAGES = ['/portal', '/instructor', '/partner']

function matches(path: string, prefixes: string[]) {
  return prefixes.some(p => path === p || path.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  if (process.env.NODE_ENV === 'development') return supabaseResponse

  const path = request.nextUrl.pathname
  const { data: { user } } = await supabase.auth.getUser()

  const admin = (): SupabaseClient => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  async function isStaff(uid: string): Promise<boolean> {
    const db = admin()
    const { data: prof } = await db.from('profiles').select('role').eq('id', uid).single()
    if (prof?.role === 'admin') return true
    const { data: instr } = await db.from('instructors').select('id, staff_role').eq('profile_id', uid).eq('active', true).maybeSingle()
    return !!instr // active instructor (incl. the owner)
  }
  async function isAdminOrOwner(uid: string): Promise<boolean> {
    const db = admin()
    const { data: prof } = await db.from('profiles').select('role').eq('id', uid).single()
    if (prof?.role === 'admin') return true
    const { data: owner } = await db.from('instructors').select('id').eq('profile_id', uid).eq('staff_role', 'owner').maybeSingle()
    return !!owner
  }

  // ---- API authorization --------------------------------------------------
  if (path.startsWith('/api')) {
    // Anchored match — '/api/accounts/*' (admin) must NOT match '/api/account'.
    if (matches(path, OPEN_API)) return supabaseResponse
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (await isStaff(user.id)) return supabaseResponse
    return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })
  }

  // ---- Page authorization -------------------------------------------------
  const isMember = matches(path, MEMBER_PAGES)
  // Anything that isn't a member portal or a known public page is an admin page.
  // '/auth/callback' MUST be public: the OAuth round-trip lands here with a
  // `code` but no session yet, so gating it would bounce the user to /login
  // before the code is exchanged. '/contact' is the public studio contact form.
  const PUBLIC_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password', '/accept-invite', '/auth/callback', '/contact', '/pay', '/post-login', '/unsubscribe', '/']
  const isPublic = matches(path, PUBLIC_PAGES) || path === '/'
  const isAdminPage = !isMember && !isPublic

  if (isPublic) return supabaseResponse
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  if (isAdminPage) {
    if (await isAdminOrOwner(user.id)) return supabaseResponse
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Member portals — owners/admins may preview; instructors/partners need a row.
  if (await isAdminOrOwner(user.id)) return supabaseResponse
  if (matches(path, ['/instructor'])) {
    const { data: row } = await admin().from('instructors').select('id').eq('profile_id', user.id).maybeSingle()
    if (!row) return NextResponse.redirect(new URL('/portal', request.url))
  }
  if (matches(path, ['/partner'])) {
    const { data: row } = await admin().from('partners').select('id').eq('profile_id', user.id).maybeSingle()
    if (!row) return NextResponse.redirect(new URL('/portal', request.url))
  }
  // /portal — any authenticated user.
  return supabaseResponse
}

export const config = {
  matcher: [
    // Pages: everything except Next internals and static asset files (so public
    // images/fonts/etc. aren't caught by the admin-page gate).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|json|txt|xml|woff|woff2|ttf|otf|map|pdf)$).*)',
    // API: ALWAYS gate, even paths that end in a static-looking extension
    // (e.g. /api/students/123.json) — otherwise the asset exclusion above would
    // let a crafted request skip the auth proxy and hit the route directly.
    '/api/:path*',
  ],
}
