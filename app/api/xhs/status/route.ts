/**
 * app/api/xhs/status/route.ts
 *
 * GET /api/xhs/status
 *
 * Polls the XHS login status for the authenticated user.
 * Intended to be called repeatedly after POST /api/xhs/qr until
 * the returned status is 'logged_in'.
 *
 * Responses:
 *   200 { status: 'not_started' | 'pending' | 'logged_in' | 'expired' }
 *   401 { error: 'Unauthorized' }
 *   503 { error: 'XHS_SERVICE_UNAVAILABLE' }
 */

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { checkLoginStatus } from '@/lib/xhs-mcp-client'

export async function GET() {
  // 1. Auth check
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Call MCP server
  try {
    const result = await checkLoginStatus(user.id)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/xhs/status] MCP server error:', message)
    return Response.json({ error: 'XHS_SERVICE_UNAVAILABLE' }, { status: 503 })
  }
}
