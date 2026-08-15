import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/// Request-scoped client that reads and refreshes the session cookie. Uses the
/// publishable key, never the service role: this client acts as the signed-in user.
export async function supabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server components cannot set cookies. The proxy refreshes the session
            // on every request, so the write that matters has already happened and
            // there is nothing to recover here.
          }
        },
      },
    },
  )
}
