/**
 * app/api/agents/radar/route.ts
 *
 * POST /api/agents/radar
 *
 * 信息雷达 Agent — searches XHS notes and streams AI trend analysis.
 *
 * Phase 1 (current): returns mock XHS notes + real Claude analysis via SSE.
 * Phase 2 (XHS Agent): replace MOCK_NOTES with actual data from the XHS
 *   scraping service. See the "XHS Agent Integration" section at the bottom
 *   of this file for the expected interface contract.
 *
 * SSE event sequence:
 *   {"event":"start",  "data":{"conversation_id":"uuid","message_id":"uuid"}}
 *   {"event":"notes",  "data":XHSNote[]}           ← full notes array
 *   {"event":"delta",  "data":{"type":"delta","text":"...","index":0}}
 *   {"event":"done",   "data":{"type":"done",...}}
 *   {"event":"error",  "data":{"type":"error",...}} ← replaces done on failure
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { DEFAULT_MODEL } from '@/lib/claude'
import type { XHSNote, AgentType, RadarSearchResult } from '@/types'

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
const encoder = new TextEncoder()

function sseFrame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
}

// ---------------------------------------------------------------------------
// Mock XHS data (Phase 1)
// Replace this function in Phase 2 with a call to the XHS Agent service.
// See XHS Agent Integration contract at the bottom of this file.
// ---------------------------------------------------------------------------
function generateMockNotes(query: string, limit: number): XHSNote[] {
  const now = new Date().toISOString()
  const baseNotes: Omit<XHSNote, 'id' | 'title' | 'content_preview' | 'tags'>[] = [
    {
      author: '小红书达人一号',
      author_id: 'xhs_author_001',
      likes: 12300,
      comments: 456,
      shares: 789,
      cover_image_url: 'https://example.com/cover1.jpg',
      note_url: 'https://www.xiaohongshu.com/explore/mock001',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      collected_at: now,
    },
    {
      author: '时尚博主小美',
      author_id: 'xhs_author_002',
      likes: 8900,
      comments: 234,
      shares: 312,
      cover_image_url: 'https://example.com/cover2.jpg',
      note_url: 'https://www.xiaohongshu.com/explore/mock002',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      collected_at: now,
    },
    {
      author: '生活方式KOL',
      author_id: 'xhs_author_003',
      likes: 23400,
      comments: 1023,
      shares: 567,
      cover_image_url: null,
      note_url: 'https://www.xiaohongshu.com/explore/mock003',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      collected_at: now,
    },
    {
      author: '种草专家大v',
      author_id: 'xhs_author_004',
      likes: 5600,
      comments: 189,
      shares: 234,
      cover_image_url: 'https://example.com/cover4.jpg',
      note_url: 'https://www.xiaohongshu.com/explore/mock004',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      collected_at: now,
    },
    {
      author: '内容创作小白',
      author_id: 'xhs_author_005',
      likes: 3400,
      comments: 98,
      shares: 156,
      cover_image_url: 'https://example.com/cover5.jpg',
      note_url: 'https://www.xiaohongshu.com/explore/mock005',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      collected_at: now,
    },
  ]

  return baseNotes.slice(0, Math.min(limit, 5)).map((note, i) => ({
    ...note,
    id: `mock_note_${i + 1}_${Date.now()}`,
    title: `关于「${query}」的热门笔记 #${i + 1}`,
    content_preview: `这是一篇关于${query}的高质量笔记，分享了实用技巧和个人经验，获得了大量用户点赞收藏...（mock数据）`,
    tags: [query, '小红书', '种草', '生活方式', '推荐'],
  }))
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Auth check
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse & validate body
  let body: { query?: string; conversation_id?: string; limit?: number; filters?: Record<string, unknown> }
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

  const { query, conversation_id, filters } = body
  const limit = Math.min(body.limit ?? 20, 50)

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'query is required' },
      },
      { status: 422 }
    )
  }

  if (query.length > 500) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'query must be at most 500 characters' },
      },
      { status: 422 }
    )
  }

  // 3. Supabase — find or create conversation
  const supabase = createClient()
  let convId = conversation_id ?? null

  if (!convId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        agent_type: 'radar' as AgentType,
        title: `雷达：${query.slice(0, 50)}`,
        message_count: 0,
      })
      .select()
      .single()

    if (convErr || !conv) {
      return Response.json(
        {
          success: false,
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create conversation' },
        },
        { status: 500 }
      )
    }
    convId = conv.id
  }

  // Insert user message
  await supabase.from('messages').insert({
    conversation_id: convId,
    role: 'user' as const,
    content: query,
    metadata: null,
  })

  // Pre-create assistant message to get stable ID
  const { data: assistantMsg } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      role: 'assistant' as const,
      content: '',
      metadata: {
        agent_type: 'radar' as AgentType,
        model: DEFAULT_MODEL,
        search_query: query,
      },
    })
    .select()
    .single()

  const messageId = assistantMsg?.id ?? crypto.randomUUID()

  // 4. Check radar_results cache
  const now = new Date()
  const { data: cachedResult } = await supabase
    .from('radar_results')
    .select('*')
    .eq('user_id', user.id)
    .eq('query', query)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let notes: XHSNote[]
  let radarResultId: string
  let isCached = false

  if (cachedResult) {
    // Cache hit
    notes = cachedResult.results.notes
    radarResultId = cachedResult.id
    isCached = true
  } else {
    // Cache miss — use mock data (Phase 1) or live XHS data (Phase 2)
    const searchStart = Date.now()
    notes = generateMockNotes(query, limit)

    const searchResult: RadarSearchResult = {
      id: crypto.randomUUID(),
      query,
      notes,
      trending_tags: [query, '热门', '种草', '推荐'],
      total_found: notes.length,
      search_time_ms: Date.now() - searchStart,
      cached: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { data: savedResult } = await supabase
      .from('radar_results')
      .insert({
        user_id: user.id,
        query,
        results: searchResult,
        expires_at: expiresAt,
      })
      .select()
      .single()

    radarResultId = savedResult?.id ?? searchResult.id
  }

  // 5. Build Claude analysis prompt
  const noteSummary = notes
    .slice(0, 10)
    .map(
      (n, i) =>
        `${i + 1}. 《${n.title}》 - 作者: ${n.author}, 点赞: ${n.likes}, 评论: ${n.comments}, 标签: ${n.tags.join(' ')}`
    )
    .join('\n')

  const filterContext = filters
    ? `筛选条件: ${JSON.stringify(filters)}\n`
    : ''

  const analysisPrompt = `你是一位专业的小红书数据分析师。请分析以下关于「${query}」的搜索结果，提供深度洞察。
${filterContext}
搜索结果（共 ${notes.length} 条笔记，${isCached ? '来自缓存' : 'mock数据'}）：
${noteSummary}

请从以下维度分析：
1. **内容趋势** — 当前热门内容方向和话题
2. **用户痛点** — 目标受众最关心的问题
3. **爆款规律** — 高互动笔记的共同特征
4. **差异化机会** — 未被充分覆盖的选题角度
5. **创作建议** — 3-5条具体的内容创作建议
6. **最佳发布时机** — 推荐的发布时间和频率`

  // 6. Stream Claude analysis
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Emit start event
        controller.enqueue(
          sseFrame('start', {
            conversation_id: convId,
            message_id: messageId,
          })
        )

        // Emit notes list
        controller.enqueue(sseFrame('notes', notes))

        // Stream Claude analysis
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const stream = await anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: 1500,
          messages: [{ role: 'user', content: analysisPrompt }],
        })

        let fullAnalysis = ''
        let index = 0

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullAnalysis += text
            controller.enqueue(
              sseFrame('delta', { type: 'delta', text, index })
            )
            index++
          }
        }

        const finalMessage = await stream.finalMessage()
        const usage = finalMessage.usage

        // Persist completed assistant message
        if (assistantMsg?.id) {
          await supabase
            .from('messages')
            .update({
              content: fullAnalysis,
              metadata: {
                agent_type: 'radar' as AgentType,
                model: DEFAULT_MODEL,
                tokens_used: usage.input_tokens + usage.output_tokens,
                radar_result_id: radarResultId,
                search_query: query,
              },
            })
            .eq('id', assistantMsg.id)
        }

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId)

        controller.enqueue(
          sseFrame('done', {
            type: 'done',
            message_id: messageId,
            conversation_id: convId,
            usage: {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
            },
          })
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Claude API error'
        controller.enqueue(
          sseFrame('error', {
            type: 'error',
            code: 'UPSTREAM_ERROR',
            message,
          })
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// =============================================================================
// XHS Agent Integration Contract (Phase 2)
// =============================================================================
//
// When the XHS Agent is ready to provide real data, replace the call to
// `generateMockNotes(query, limit)` above with a call to the XHS service.
//
// Expected integration point (around line 160):
//
//   // Replace this:
//   notes = generateMockNotes(query, limit)
//
//   // With this (example):
//   const xhsResponse = await fetchXHSNotes(query, { limit, filters })
//   notes = xhsResponse.notes
//
// The XHS Agent must return data matching the `XHSNote` interface from
// `types/index.ts`:
//
//   interface XHSNote {
//     id: string                // Unique note ID from XHS
//     title: string             // Note title
//     author: string            // Display name
//     author_id: string         // XHS author UID
//     content_preview: string   // First ~200 chars of note body
//     likes: number             // Like count
//     comments: number          // Comment count
//     shares: number            // Share/collect count
//     tags: string[]            // Array of hashtag strings (without #)
//     cover_image_url: string | null  // Cover image URL or null
//     note_url: string          // Full URL to the note on XHS
//     published_at: string      // ISO 8601 timestamp
//     collected_at: string      // When this data was scraped (ISO 8601)
//   }
//
// Recommended service interface:
//
//   // lib/xhs-client.ts (to be created by XHS Agent)
//   export async function fetchXHSNotes(
//     query: string,
//     options: { limit: number; filters?: RadarFilters }
//   ): Promise<{ notes: XHSNote[]; total: number; search_time_ms: number }>
//
// The radar_results caching layer (Supabase table) is already implemented
// in this route — the XHS Agent does NOT need to handle caching.
// Cache TTL: 24 hours per (user_id, query) pair.
// =============================================================================
