/**
 * app/api/conversations/route.ts
 *
 * GET  /api/conversations — List the current user's conversations (paginated)
 * POST /api/conversations — Create a new conversation
 */

import { NextRequest } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import type { AgentType, ApiResponse, ConversationListResponse, Conversation } from '@/types'

// ---------------------------------------------------------------------------
// GET /api/conversations
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const agentType = searchParams.get('agent_type') as AgentType | null
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limitParam = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limitParam

  const supabase = createClient()

  // Build query
  let query = supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limitParam - 1)

  if (agentType && (agentType === 'radar' || agentType === 'script')) {
    query = query.eq('agent_type', agentType)
  }

  const { data, count, error } = await query

  if (error) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' },
      },
      { status: 500 }
    )
  }

  const total = count ?? 0
  const hasMore = offset + limitParam < total

  const response: ApiResponse<ConversationListResponse> = {
    success: true,
    data: {
      items: (data ?? []) as Conversation[],
      total,
      page,
      limit: limitParam,
      has_more: hasMore,
      next_cursor: hasMore ? String(page + 1) : null,
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
// POST /api/conversations
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
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

  let body: { agent_type?: string; title?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
      },
      { status: 422 }
    )
  }

  const { agent_type, title } = body

  const validAgentTypes: AgentType[] = ['radar', 'script']
  if (!agent_type || !validAgentTypes.includes(agent_type as AgentType)) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: `agent_type must be one of: ${validAgentTypes.join(', ')}`,
        },
      },
      { status: 422 }
    )
  }

  const conversationTitle =
    title && typeof title === 'string' && title.trim().length > 0
      ? title.trim().slice(0, 200)
      : 'New Conversation'

  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      agent_type: agent_type as AgentType,
      title: conversationTitle,
      message_count: 0,
    })
    .select()
    .single()

  if (error || !data) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create conversation' },
      },
      { status: 500 }
    )
  }

  const response: ApiResponse<Conversation> = {
    success: true,
    data: data as Conversation,
    error: null,
    meta: {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      duration_ms: 0,
    },
  }

  return Response.json(response, { status: 201 })
}
