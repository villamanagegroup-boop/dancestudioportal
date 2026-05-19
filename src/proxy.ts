import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

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

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const adminPaths = ['/dashboard', '/students', '/classes', '/enrollments', '/billing', '/staff', '/communications', '/documents', '/import']
  const isAdminPath = adminPaths.some(p => path.startsWith(p))
  const isInstructorPath = path.startsWith('/instructor')
  const isPartnerPath = path.startsWith('/partner')
  const isPortalPath = path.startsWith('/portal')

  if (isAdminPath || isInstructorPath || isPartnerPath || isPortalPath) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role + entitlement lookups use service-role to dodge edge-runtime RLS quirks.
  const needsCheck = isAdminPath || isInstructorPath || isPartnerPath
  if (needsCheck && user) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role ?? null

    // Admin role can access anything.
    if (role === 'admin') return supabaseResponse

    if (isAdminPath) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    if (isInstructorPath) {
      if (role === 'instructor') return supabaseResponse
      const { data: row } = await admin
        .from('instructors').select('id').eq('profile_id', user.id).maybeSingle()
      if (!row) return NextResponse.redirect(new URL('/portal', request.url))
    }

    if (isPartnerPath) {
      if (role === 'partner') return supabaseResponse
      const { data: row } = await admin
        .from('partners').select('id').eq('profile_id', user.id).maybeSingle()
      if (!row) return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/students/:path*', '/classes/:path*',
    '/enrollments/:path*', '/billing/:path*', '/staff/:path*',
    '/communications/:path*', '/settings/:path*', '/portal/:path*',
    '/instructor/:path*', '/partner/:path*',
    '/documents/:path*', '/import/:path*',
  ],
}
