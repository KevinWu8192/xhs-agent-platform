/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client for use in:
 *   - Server Components (RSC)
 *   - Route Handlers (app/api/*)
 *   - Server Actions
 *
 * This client reads and writes cookies via the Next.js `cookies()` API
 * so that session tokens are properly forwarded on server requests.
 *
 * NOTE: This must only be imported in server-side code (no 'use client').
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export type TypedSupabaseServerClient = SupabaseClient<Database>

/**
 * Creates a server-side Supabase client bound to the current request's cookies.
 * Must be called per-request (do not cache across requests).
 *
 * @example
 * // In a Server Component or Route Handler:
 * const supabase = createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export function createClient(): TypedSupabaseServerClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const cookieStore = cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // `set` is called from a Server Component; cookies can only be
          // mutated inside a Route Handler or Server Action. Safe to ignore.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Same as above — safe to ignore in read-only server contexts.
        }
      },
    },
  })
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in trusted server-side contexts (e.g. cron jobs,
 * admin operations). Never expose this client to the browser.
 *
 * @example
 * // In a secure Route Handler (verified by your own auth check):
 * const supabase = createAdminClient()
 * await supabase.from('radar_results').delete().lt('expires_at', new Date().toISOString())
 */
export function createAdminClient(): TypedSupabaseServerClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required environment variables: ' +
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  // Service role client does not need cookie management
  // TODO: Import createClient from @supabase/supabase-js directly for admin use
  // import { createClient as createSupabaseClient } from '@supabase/supabase-js'
  // return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
  //   auth: { autoRefreshToken: false, persistSession: false },
  // })
  throw new Error('TODO: implement createAdminClient with @supabase/supabase-js')
}

// -----------------------------------------------------------------------------
// Auth helpers for Route Handlers
// -----------------------------------------------------------------------------

/**
 * Gets the currently authenticated user from the server-side session.
 * Returns null if the user is not authenticated (do not throw).
 *
 * @example
 * export async function GET() {
 *   const user = await getAuthenticatedUser()
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   ...
 * }
 */
export async function getAuthenticatedUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}
