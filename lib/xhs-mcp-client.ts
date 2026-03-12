/**
 * lib/xhs-mcp-client.ts
 *
 * XHS MCP client utilities.
 *
 * Exports two layers:
 *
 *   1. createXHSMCPClient() — factory that returns an MCP client + tools via
 *      `experimental_createMCPClient` from the Vercel AI SDK.  Used by the
 *      radar route so Claude can autonomously call XHS MCP tools.
 *
 *   2. Legacy typed wrappers (searchXHS, checkLoginStatus, getQRCode, …) that
 *      call the new HTTP server on port 8001 directly.  These are used for
 *      simple non-agentic API routes (QR login flow, etc.) and as a fallback
 *      when the MCP SSE connection fails.
 *
 * MCP SSE server  : http://localhost:8000/sse  (fastmcp, for agentic calls)
 * HTTP login server: http://localhost:8001      (for QR login flow only)
 *
 * NOTE: Server-side only — never import this module in client components.
 */

import { experimental_createMCPClient } from 'ai'
import type { XHSNote } from '@/types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** SSE endpoint for the fastmcp MCP server (used by the AI SDK MCP client). */
const MCP_SSE_URL = process.env.XHS_MCP_SSE_URL ?? 'http://localhost:8000/sse'

/**
 * HTTP base URL for the QR-login-only server.
 * All non-agentic HTTP calls (getQRCode, checkLoginStatus, searchXHS fallback)
 * hit this server.
 */
const MCP_HTTP_URL = process.env.XHS_MCP_HTTP_URL ?? 'http://localhost:8001'

// ---------------------------------------------------------------------------
// MCP Client factory (Vercel AI SDK)
// ---------------------------------------------------------------------------

export interface XHSMCPClientResult {
  /** The raw MCP client — call client.close() when done. */
  client: Awaited<ReturnType<typeof experimental_createMCPClient>>
  /** Tools object ready to pass to streamText(). */
  tools: Awaited<ReturnType<Awaited<ReturnType<typeof experimental_createMCPClient>>['tools']>>
}

/**
 * Creates an MCP client connected to the XHS fastmcp SSE server and returns
 * the client plus the tool definitions.
 *
 * Throws if the server is unreachable; callers should catch and fall back to
 * the legacy HTTP wrappers.
 *
 * @example
 * const { client, tools } = await createXHSMCPClient()
 * try {
 *   const result = streamText({ model, tools, messages, maxSteps: 5 })
 *   // ...
 * } finally {
 *   await client.close()
 * }
 */
export async function createXHSMCPClient(): Promise<XHSMCPClientResult> {
  const client = await experimental_createMCPClient({
    transport: {
      type: 'sse',
      url: MCP_SSE_URL,
    },
  })

  const tools = await client.tools()

  return { client, tools }
}

// ---------------------------------------------------------------------------
// Core RPC helper (legacy HTTP — hits port 8001)
// ---------------------------------------------------------------------------

/**
 * Call any tool on the HTTP MCP server (port 8001).
 * Throws if the HTTP request itself fails (network error / server down).
 * Throws with the server's error message if the tool returns an error payload.
 */
export async function callMCPTool<T>(
  tool: string,
  params: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${MCP_HTTP_URL}/tools/call`, {
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
// Legacy typed tool wrappers (hit port 8001)
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
    publish_time?: string
  }
): Promise<{ notes: XHSNote[]; total: number; search_time_ms: number }> {
  const params: Record<string, unknown> = {
    user_id: userId,
    keyword,
  }
  if (options?.limit !== undefined) params.limit = options.limit
  if (options?.sort_by !== undefined) params.sort_by = options.sort_by
  if (options?.note_type !== undefined) params.note_type = options.note_type
  if (options?.publish_time !== undefined) params.publish_time = options.publish_time

  return callMCPTool('search_feeds', params)
}

/**
 * Fetch the full detail of a single XHS note/feed.
 * Requires the user to be logged in.
 */
export async function getFeedDetail(
  userId: string,
  feedId: string,
  xsecToken?: string
): Promise<XHSNote> {
  return callMCPTool('get_feed_detail', {
    user_id: userId,
    feed_id: feedId,
    ...(xsecToken && { xsec_token: xsecToken }),
  })
}

/**
 * @deprecated Use searchXHS() instead. Kept for backwards compatibility.
 */
export async function getNoteDetail(
  userId: string,
  noteId: string
): Promise<XHSNote> {
  return getFeedDetail(userId, noteId)
}
