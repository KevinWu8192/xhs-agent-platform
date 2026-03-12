/**
 * lib/xhs-mcp-client.ts
 *
 * Typed client for the XHS Scraper MCP Server.
 *
 * The MCP server exposes a single endpoint:
 *   POST /tools/call  { "tool": "<name>", "params": {...} }
 *
 * Available tools: get_qr_code, check_login_status, search_xhs, get_note_detail
 *
 * NOTE: Uses XHS_SCRAPER_URL (no NEXT_PUBLIC_ prefix) — this module is
 * server-side only (API routes / Server Components). Never import it from
 * client components.
 */

import type { XHSNote } from '@/types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MCP_BASE_URL = process.env.XHS_SCRAPER_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Core RPC helper
// ---------------------------------------------------------------------------

/**
 * Call any tool on the MCP server.
 * Throws if the HTTP request itself fails (network error / server down).
 * Throws with the server's error message if the tool returns an error payload.
 */
export async function callMCPTool<T>(
  tool: string,
  params: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${MCP_BASE_URL}/tools/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MCP server returned HTTP ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { error?: string } & T
  if (json.error) {
    throw new Error(json.error)
  }

  return json as T
}

// ---------------------------------------------------------------------------
// Typed tool wrappers
// ---------------------------------------------------------------------------

/**
 * Initiates XHS login for a user.
 * Returns a QR code image (base64) to be displayed to the user, or confirms
 * the user is already logged in.
 */
export async function getQRCode(userId: string): Promise<{
  status: 'qr_ready' | 'already_logged_in'
  qr_image_base64?: string
  session_id?: string
}> {
  return callMCPTool('get_qr_code', { user_id: userId })
}

/**
 * Polls the login status for a user session.
 * Call this repeatedly after getQRCode() until status is 'logged_in'.
 */
export async function checkLoginStatus(userId: string): Promise<{
  status: 'not_started' | 'pending' | 'logged_in' | 'expired'
}> {
  return callMCPTool('check_login_status', { user_id: userId })
}

/**
 * Search XHS for notes matching a keyword.
 * Requires the user to be logged in (status === 'logged_in').
 * Throws an error with message "not_logged_in" if the user session is missing.
 */
export async function searchXHS(
  userId: string,
  keyword: string,
  options?: {
    limit?: number
    sort_by?: string
    note_type?: string
  }
): Promise<{ notes: XHSNote[]; total: number; search_time_ms: number }> {
  const params: Record<string, unknown> = {
    user_id: userId,
    keyword,
  }
  if (options?.limit !== undefined) params.limit = options.limit
  if (options?.sort_by !== undefined) params.sort_by = options.sort_by
  if (options?.note_type !== undefined) params.note_type = options.note_type

  return callMCPTool('search_xhs', params)
}

/**
 * Fetch the full detail of a single XHS note.
 * Requires the user to be logged in.
 */
export async function getNoteDetail(
  userId: string,
  noteId: string
): Promise<XHSNote> {
  return callMCPTool('get_note_detail', { user_id: userId, note_id: noteId })
}
