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

  const adminPaths = ['/dashboard', '/students', '/classes', '/enrollments', '/billing', '/staff', '/communications']
  const isAdminPath = adminPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isAdminPath) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    // Use service-role for the role lookup — RLS via the edge SSR client
    // unreliably hides the row, even when the same query works in a page render.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  if (request.nextUrl.pathname.startsWith('/portal')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
  }

  if (request.nextUrl.pathname.startsWith('/partner')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'partner' && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/students/:path*', '/classes/:path*',
    '/enrollments/:path*', '/billing/:path*', '/staff/:path*',
    '/communications/:path*', '/settings/:path*', '/portal/:path*',
    '/partner/:path*',
  ],
}
