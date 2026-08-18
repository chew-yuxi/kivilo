import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/// Refreshes the Supabase session cookie and bounces signed-out visitors to /login.
///
/// This is an optimistic check, not the security boundary. Next's own guidance is that
/// proxy should not be used as an authorization solution, so the real enforcement is in
/// `src/lib/auth.ts`, which every read and write goes through. Deleting this file would
/// cost session refresh and a redirect, not access control.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  /// Only the inspector-facing app. Shared reports are deliberately outside it: the
  /// token in the URL is the credential, and a landlord has no account.
  matcher: ['/inspections/:path*'],
}
