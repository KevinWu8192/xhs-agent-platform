/**
 * app/api/xhs/qr/route.ts
 *
 * POST /api/xhs/qr
 *
 * Initiates XHS login by requesting a QR code from the HTTP login server
 * (http://localhost:8001).
 *
 * The client should display the QR code image and then poll
 * GET /api/xhs/status until the status reaches 'logged_in'.
 *
 * NOTE: The QR / login flow uses the HTTP server on port 8001, NOT the
 * MCP SSE server on port 8000. Port 8000 is the fastmcp SSE server used
 * by the AI SDK for agentic tool calls.
 *
 * Request body (all fields optional):
 *   { "user_id"?: string }   — if omitted, uses the authenticated user's ID
 *
 * Responses:
 *   200 { status: 'qr_ready', qr_image_base64: string, session_id?: string }
 *   200 { status: 'already_logged_in' }
 *   401 { error: 'Unauthorized' }
 *   503 { error: 'XHS_SERVICE_UNAVAILABLE' }
 */

import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getQRCode } from '@/lib/xhs-mcp-client'

export async function POST(req: NextRequest) {
  // 1. Auth check
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse optional body — user_id defaults to authenticated user
  let userId = user.id
  try {
    const body = await req.json()
    if (body?.user_id && typeof body.user_id === 'string') {
      userId = body.user_id
    }
  } catch {
    // Body is optional; ignore parse errors
  }

  // 3. Call HTTP login server (port 8001)
  try {
    const result = await getQRCode(userId)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/xhs/qr] HTTP login server error:', message)
    return Response.json({ error: 'XHS_SERVICE_UNAVAILABLE' }, { status: 503 })
  }
}
