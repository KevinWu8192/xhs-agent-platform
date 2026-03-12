/**
 * lib/supabase/middleware.ts
 *
 * Auth middleware helpers for Next.js middleware.ts (project root).
 *
 * Responsibilities:
 *   1. Refresh the Supabase session token on every request so it never expires
 *      mid-session from the user's perspective.
 *   2. Protect authenticated routes — redirect unauthenticated users to /login.
 *   3. Redirect already-authenticated users away from auth pages (/login, /signup).
 *
 * Usage in middleware.ts:
 * ```ts
 * import { updateSession } from '@/lib/supabase/middleware'
 * export async function middleware(request: NextRequest) {
 *   return updateSession(request)
 * }
 * export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
 * ```
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

// Routes that require authentication
const PROTECTED_ROUTE_PREFIXES = ['/dashboard', '/agents', '/conversations', '/profile']

// Routes that are only for unauthenticated users
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']

// Public routes that never require auth (API, static, etc.)
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon.ico']

/**
 * Refreshes the Supabase session and enforces route-level auth protection.
 * Call this from the root `middleware.ts` file.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail open in dev if env vars are missing; log a warning
    console.warn('[Supabase Middleware] Missing environment variables — skipping auth check')
    return response
  }

  // Build a Supabase client that reads/writes cookies on the in-flight response
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        // Mutate both request and response so downstream code sees fresh cookies
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  // IMPORTANT: always call getUser() (not getSession()) to revalidate the JWT
  // with the Supabase Auth server. getSession() reads only the local cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Skip auth logic for public prefixes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return response
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// -----------------------------------------------------------------------------
// Route handler auth guard (for use inside API routes)
// -----------------------------------------------------------------------------

/**
 * Type-safe result from requireAuth.
 */
export type AuthResult =
  | { authenticated: true; userId: string; email: string }
  | { authenticated: false; userId: null; email: null }

/**
 * Validates the session inside an API Route Handler.
 * Returns user identity or an unauthenticated marker.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await requireAuth(request)
 *   if (!auth.authenticated) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *   const { userId } = auth
 *   ...
 * }
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, userId: null, email: null }
  }

  // TODO: Extract into a shared cookie-builder once cookie handling is finalized
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      // Route handlers are read-only for this helper — mutations not needed
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { authenticated: false, userId: null, email: null }
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email ?? '',
  }
}
