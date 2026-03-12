/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client.
 * Use this in Client Components ('use client') and browser-side hooks.
 *
 * Uses @supabase/ssr which correctly manages cookies in Next.js App Router.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Re-export a typed client for use across the app
export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null

/**
 * Returns a singleton browser-side Supabase client.
 * Calling this multiple times returns the same instance.
 */
export function createClient(): TypedSupabaseClient {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return client
}

// Convenience default export for quick imports
export default createClient
