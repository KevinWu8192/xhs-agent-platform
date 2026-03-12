/**
 * app/api/conversations/[id]/route.ts
 *
 * GET    /api/conversations/[id] — Fetch conversation with full message history
 * DELETE /api/conversations/[id] — Delete conversation (RLS enforces ownership)
 */

import { NextRequest } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import type {
  ApiResponse,
  Conversation,
  AgentMessage,
  PaginatedResponse,
} from '@/types'

type RouteContext = { params: { id: string } }

// ---------------------------------------------------------------------------
// GET /api/conversations/[id]
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 }
    )
  }

  const conversationId = params.id
  if (!conversationId) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Conversation ID is required' },
      },
      { status: 422 }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limitParam = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limitParam

  const supabase = createClient()

  // Fetch conversation — RLS ensures only the owner can read it
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    // If no row returned, distinguish not-found from forbidden
    // (Supabase with RLS returns no rows rather than a 403 for inaccessible rows)
    const { data: anyConv } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single()

    if (!anyConv) {
      return Response.json(
        {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        },
        { status: 404 }
      )
    }

    // Row exists but RLS blocked it — forbidden
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this conversation' },
      },
      { status: 403 }
    )
  }

  // Extra ownership check in case RLS is not yet active in dev
  if (conversation.user_id !== user.id) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this conversation' },
      },
      { status: 403 }
    )
  }

  // Fetch messages (paginated)
  const { data: messages, count: messageCount, error: msgError } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limitParam - 1)

  if (msgError) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' },
      },
      { status: 500 }
    )
  }

  const total = messageCount ?? 0
  const hasMore = offset + limitParam < total

  const messagesPage: PaginatedResponse<AgentMessage> = {
    items: (messages ?? []) as AgentMessage[],
    total,
    page,
    limit: limitParam,
    has_more: hasMore,
    next_cursor: hasMore ? String(page + 1) : null,
  }

  const response: ApiResponse<{
    conversation: Conversation
    messages: PaginatedResponse<AgentMessage>
  }> = {
    success: true,
    data: {
      conversation: conversation as Conversation,
      messages: messagesPage,
    },
    error: null,
    meta: {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      duration_ms: 0,
    },
  }

  return Response.json(response)
}

// ---------------------------------------------------------------------------
// DELETE /api/conversations/[id]
// ---------------------------------------------------------------------------
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 }
    )
  }

  const conversationId = params.id
  if (!conversationId) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Conversation ID is required' },
      },
      { status: 422 }
    )
  }

  const supabase = createClient()

  // Verify existence and ownership before deleting
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .single()

  if (fetchError || !conversation) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      },
      { status: 404 }
    )
  }

  if (conversation.user_id !== user.id) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You cannot delete this conversation' },
      },
      { status: 403 }
    )
  }

  // Delete (cascades to messages via FK in schema)
  const { error: deleteError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id) // Belt-and-suspenders ownership check

  if (deleteError) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete conversation' },
      },
      { status: 500 }
    )
  }

  return new Response(null, { status: 204 })
}
