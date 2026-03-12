/**
 * app/api/agents/radar/route.ts
 *
 * POST /api/agents/radar
 *
 * 信息雷达 Agent — searches XHS notes and streams AI trend analysis.
 *
 * Architecture:
 *   1. Auth + input validation
 *   2. Supabase: load user AI settings, find/create conversation
 *   3. Check radar_results cache (24-hour TTL per user+query)
 *   4. Cache miss → create MCP client connecting to http://localhost:8000/sse
 *      Claude autonomously calls search_feeds (and optionally get_feed_detail)
 *      via streamText() with maxSteps=5
 *   5. Capture notes from tool call results, emit as SSE "notes" event
 *   6. Stream Claude's analysis text as "delta" events
 *   7. Persist results + emit "done"
 *
 * Fallback chain (if MCP SSE is unavailable):
 *   MCP SSE (port 8000) → legacy HTTP searchXHS (port 8001) → xhs-client CLI → mock data
 *
 * SSE event sequence:
 *   {"event":"start",  "data":{"conversation_id":"uuid","message_id":"uuid"}}
 *   {"event":"notes",  "data":XHSNote[]}
 *   {"event":"delta",  "data":{"type":"delta","text":"...","index":0}}
 *   {"event":"done",   "data":{"type":"done",...}}
 *   {"event":"error",  "data":{"type":"error",...}}
 *   {"event":"xhs_login_required", "data":{"message":"..."}}
 */

import { NextRequest } from 'next/server'
import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/claude'
import type { XHSNote, AgentType, RadarSearchResult } from '@/types'
import { fetchXHSNotes } from '@/lib/xhs-client'
import { createXHSMCPClient, searchXHS } from '@/lib/xhs-mcp-client'

// ---------------------------------------------------------------------------
// Structured logger — PM2 captures stdout, grep with [RADAR:xxx]
// ---------------------------------------------------------------------------
function radarLog(rid: string, step: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
  const extra = data ? ' ' + JSON.stringify(data, null, 0) : ''
  console.log(`[RADAR:${rid}] [${ts}] ${step}${extra}`)
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
const encoder = new TextEncoder()

function sseFrame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
}

// ---------------------------------------------------------------------------
// Mock XHS data (last-resort fallback)
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
  // Short request ID for log correlation
  const rid = Math.random().toString(36).slice(2, 8).toUpperCase()

  // 1. Auth check
  const user = await getAuthenticatedUser()
  if (!user) {
    radarLog(rid, 'AUTH_FAIL', { reason: 'no user' })
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
  radarLog(rid, 'REQUEST', { query, limit, user_id: user.id.slice(0, 8) })

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

  // 3. Supabase — load user AI settings and find or create conversation
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_api_key, ai_base_url, ai_model')
    .eq('user_id', user.id)
    .single()

  const userAISettings = {
    apiKey: profile?.ai_api_key,
    baseUrl: profile?.ai_base_url,
    model: profile?.ai_model,
  }

  // Validate that we have an API key before proceeding
  const apiKey = userAISettings.apiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    radarLog(rid, 'NO_API_KEY')
    return Response.json(
      { error: 'API_KEY_NOT_CONFIGURED', message: '请先在「设置」页面配置你的 AI API Key' },
      { status: 422 }
    )
  }

  const model = resolveModel(userAISettings)
  radarLog(rid, 'MODEL_SETTINGS', {
    model,
    baseUrl: userAISettings.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? '(default)',
    hasCustomKey: !!userAISettings.apiKey,
  })

  // Skip the upfront checkLoginStatus() call — port 8001 tracks QR-scan state in
  // memory and returns 'not_started' after a server restart even when the XHS
  // cookies on disk are still valid. That causes a false xhs_login_required event
  // and an infinite login loop. Instead, let the MCP tools try naturally; they will
  // surface a real 'not_logged_in' error only when the session is genuinely expired.
  radarLog(rid, 'XHS_LOGIN', { status: 'skipped_precheck' })

  // Build the @ai-sdk/anthropic provider with user settings
  const anthropicProvider = createAnthropic({
    apiKey,
    ...(userAISettings.baseUrl ? { baseURL: userAISettings.baseUrl } : {}),
  })

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
        model,
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

  // ---------------------------------------------------------------------------
  // 5. Build the SSE stream
  // ---------------------------------------------------------------------------
  const readable = new ReadableStream({
    async start(controller) {
      // Emit start event immediately
      controller.enqueue(
        sseFrame('start', {
          conversation_id: convId,
          message_id: messageId,
        })
      )

      let notes: XHSNote[] = []
      let radarResultId: string
      let isCached = false
      let usedMCP = false

      // -----------------------------------------------------------------------
      // 5a. Cache hit path
      // -----------------------------------------------------------------------
      if (cachedResult) {
        notes = cachedResult.results.notes
        radarResultId = cachedResult.id
        isCached = true

        // Emit cached notes immediately
        controller.enqueue(sseFrame('notes', notes))
      } else {
        // -----------------------------------------------------------------------
        // 5b. Cache miss — try MCP agentic path first
        // -----------------------------------------------------------------------
        const searchStart = Date.now()

        // Attempt 1: MCP SSE client (Claude calls search_feeds autonomously)
        let mcpClient: Awaited<ReturnType<typeof createXHSMCPClient>>['client'] | null = null

        try {
          radarLog(rid, 'MCP_CONNECT', { url: 'http://localhost:8000/sse' })
          const { client, tools } = await createXHSMCPClient()
          mcpClient = client
          usedMCP = true
          radarLog(rid, 'MCP_READY', { toolCount: Object.keys(tools).length })

          // System prompt tells Claude its identity and that it should always
          // pass the authenticated user's ID when calling MCP tools.
          const systemPrompt = `你是一位专业的小红书趋势分析助手，拥有完整的小红书数据获取工具。

当前认证用户ID为: ${user.id}
调用任何工具时，必须将此 user_id 作为参数传入。

## 工作流程（必须严格按顺序执行）

### 第一步：搜索
- 调用 search_feeds，使用关键词「${query}」，参数：limit=${limit}，sort_by=最多点赞
- 如果关键词较宽泛，可以细化后再搜一次（最多再搜1次）

### 第二步：获取笔记详情（关键步骤，不可跳过）
- 从搜索结果中选出点赞最多的前3篇笔记
- 对每篇分别调用 get_feed_detail（传入 feed_id 和 xsec_token，load_all_comments=true，max_comment_items=15）
- 获取每篇笔记的完整正文、标签、发布时间、互动数据、热门评论

### 第三步：深度分析
- **必须基于笔记的真实内容（正文+评论）进行分析，不能凭空生成**
- 严格按以下格式输出分析报告：

## 📊 内容趋势
- 当前热门内容方向和话题（引用具体笔记标题）

## 😣 用户痛点
- 目标受众最关心的问题（来自评论分析）

## 🔥 爆款规律
- 高互动笔记的共同特征（标题风格、内容格式、字数范围）

## 🌱 差异化机会
- 当前未被充分覆盖的选题角度

## ✍️ 创作建议
- 3-5条具体可操作的建议，每条一行

## ⏰ 最佳发布时机
- 推荐的发布时间和频率（基于发布时间数据）

---
**输出约束（不要将此节作为输出章节）**：
- 分析报告必须引用具体笔记内容（例如"某篇点赞最高的笔记写道…"）
- 每个维度用 ## 标题，内容用 - 列表，不要长段落
- 总字数控制在 800-1200 字
- 不得在获取详情之前开始撰写分析报告
- 直接输出分析，不要"好的"之类的开场白
- 请用中文回复`

          const userPrompt = `请分析小红书上「${query}」相关内容，完成以下任务：

1. 搜索热门笔记（sort_by: 最多点赞）
2. 获取前3篇笔记的完整内容和热门评论
3. 基于真实内容输出深度分析报告，包含：
   - **内容趋势** — 当前热门方向和话题（引用具体笔记）
   - **用户痛点** — 目标受众最关心的问题（来自评论分析）
   - **爆款规律** — 高互动笔记的共同特征（标题、格式、长度）
   - **差异化机会** — 未被充分覆盖的角度
   - **创作建议** — 3-5条具体可操作的建议
   - **最佳发布时机** — 基于发布时间数据推断${filters ? `\n\n筛选条件: ${JSON.stringify(filters)}` : ''}`

          // Stream Claude's agentic execution
          const result = streamText({
            model: anthropicProvider(model),
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            tools,
            maxSteps: 10,
            maxTokens: 4000,
          })

          let fullAnalysis = ''
          let index = 0
          let notesEmitted = false

          let textChars = 0
          // Process the stream
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'tool-call': {
                radarLog(rid, 'TOOL_CALL', {
                  tool: part.toolName,
                  args: JSON.stringify(part.args).slice(0, 200),
                })
                break
              }

              case 'tool-result': {
                radarLog(rid, 'TOOL_RESULT', {
                  tool: part.toolName,
                  preview: JSON.stringify(part.result).slice(0, 300),
                })
                // When Claude calls search_feeds, capture the returned notes
                // and emit them as the "notes" SSE event
                if (
                  (part.toolName === 'search_feeds' || part.toolName === 'search_xhs') &&
                  !notesEmitted
                ) {
                  try {
                    // The MCP tool result can be an array of notes or a
                    // {notes: [...]} object — handle both shapes
                    const toolResult = part.result as unknown
                    // MCP tools return JSON strings — parse if needed
                    let parsedResult: unknown = toolResult
                    if (typeof toolResult === 'string') {
                      try { parsedResult = JSON.parse(toolResult) } catch { parsedResult = toolResult }
                    }

                    let extractedNotes: XHSNote[] = []

                    if (Array.isArray(parsedResult)) {
                      extractedNotes = parsedResult as XHSNote[]
                    } else if (parsedResult && typeof parsedResult === 'object') {
                      const r = parsedResult as Record<string, unknown>
                      if (Array.isArray(r.notes)) {
                        extractedNotes = r.notes as XHSNote[]
                      }
                    }

                    if (extractedNotes.length > 0) {
                      notes = extractedNotes
                      notesEmitted = true
                      controller.enqueue(sseFrame('notes', notes))
                    }
                  } catch (parseErr) {
                    console.warn('[Radar] Failed to parse search_feeds result:', parseErr)
                  }
                }
                break
              }

              case 'text-delta': {
                fullAnalysis += part.textDelta
                textChars += part.textDelta.length
                controller.enqueue(
                  sseFrame('delta', { type: 'delta', text: part.textDelta, index })
                )
                index++
                break
              }

              case 'error': {
                throw part.error
              }

              default:
                break
            }
          }

          radarLog(rid, 'STREAM_DONE', { textChars, notesEmitted, notesCount: notes.length })

          // If search_feeds was never called or returned empty (e.g. Claude
          // skipped the tool call), fall back to HTTP search
          if (!notesEmitted) {
            radarLog(rid, 'FALLBACK_HTTP', { reason: 'search_feeds not called or empty' })
            const fallback = await searchXHS(user.id, query, { limit, sort_by: '最多点赞' })
            notes = fallback.notes
            controller.enqueue(sseFrame('notes', notes))
          }

          // Retrieve final usage from the stream
          const usage = await result.usage

          // Persist completed assistant message
          if (assistantMsg?.id) {
            await supabase
              .from('messages')
              .update({
                content: fullAnalysis,
                metadata: {
                  agent_type: 'radar' as AgentType,
                  model,
                  tokens_used: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
                  search_query: query,
                },
              })
              .eq('id', assistantMsg.id)
          }

          // Save to radar_results cache
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
                input_tokens: usage.promptTokens ?? 0,
                output_tokens: usage.completionTokens ?? 0,
              },
            })
          )
          controller.close()
          return
        } catch (mcpErr) {
          const mcpErrMessage = mcpErr instanceof Error ? mcpErr.message : String(mcpErr)

          // Check for login-required error from MCP server
          if (mcpErrMessage.includes('not_logged_in')) {
            controller.enqueue(
              sseFrame('xhs_login_required', { message: '请先登录小红书' })
            )
            controller.close()
            return
          }

          radarLog(rid, usedMCP ? 'MCP_STREAM_FAIL' : 'MCP_CONNECT_FAIL', { error: mcpErrMessage.slice(0, 200) })
        } finally {
          // Always close the MCP client connection
          if (mcpClient) {
            try {
              await mcpClient.close()
            } catch {
              // Ignore close errors
            }
          }
        }

        // Attempt 2: Legacy HTTP searchXHS (port 8001)
        radarLog(rid, 'FALLBACK_HTTP_START')
        try {
          const xhsResponse = await searchXHS(user.id, query, {
            limit,
            sort_by: '最多点赞',
          })
          notes = xhsResponse.notes
          radarLog(rid, 'FALLBACK_HTTP_OK', { count: notes.length })
        } catch (httpErr) {
          const httpErrMessage = httpErr instanceof Error ? httpErr.message : String(httpErr)
          radarLog(rid, 'FALLBACK_HTTP_FAIL', { error: httpErrMessage.slice(0, 200) })

          if (httpErrMessage.includes('not_logged_in')) {
            controller.enqueue(
              sseFrame('xhs_login_required', { message: '请先登录小红书' })
            )
            controller.close()
            return
          }

          // Attempt 3: Legacy CLI client
          radarLog(rid, 'FALLBACK_CLI_START')
          try {
            const fallbackResponse = await fetchXHSNotes(query, { limit })
            notes = fallbackResponse.notes
            radarLog(rid, 'FALLBACK_CLI_OK', { count: notes.length })
          } catch (cliErr) {
            // Attempt 4: Inline mock data
            const cliErrMsg = cliErr instanceof Error ? cliErr.message : String(cliErr)
            radarLog(rid, 'FALLBACK_MOCK', { reason: cliErrMsg.slice(0, 100) })
            notes = generateMockNotes(query, limit)
          }
        }

        // Emit notes from the fallback path
        controller.enqueue(sseFrame('notes', notes))

        // Save fallback results to cache
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

      // -----------------------------------------------------------------------
      // 6. Non-MCP analysis path: build prompt and stream with @ai-sdk/anthropic
      //    (used for cache hits and all fallback paths)
      // -----------------------------------------------------------------------
      radarLog(rid, 'ANALYSIS_START', { notesCount: notes.length, isCached })
      try {
        const noteSummary = notes
          .slice(0, 10)
          .map(
            (n, i) =>
              `${i + 1}. 《${n.title}》 - 作者: ${n.author}, 点赞: ${n.likes}, 评论: ${n.comments}, 标签: ${n.tags.join(' ')}`
          )
          .join('\n')

        const filterContext = filters ? `筛选条件: ${JSON.stringify(filters)}\n` : ''

        const analysisPrompt = `你是一位专业的小红书数据分析师。请分析以下关于「${query}」的搜索结果，提供深度洞察。
${filterContext}
搜索结果（共 ${notes.length} 条笔记，${isCached ? '来自缓存' : '实时数据'}）：
${noteSummary}

请严格按以下格式输出，不要偏离结构：

## 📊 内容趋势
- 当前热门内容方向和话题（结合笔记标题和标签分析）

## 😣 用户痛点
- 目标受众最关心的问题（从高评论笔记反推）

## 🔥 爆款规律
- 高互动笔记的共同特征（标题风格、内容格式、字数范围）

## 🌱 差异化机会
- 当前未被充分覆盖的选题角度

## ✍️ 创作建议
- 3-5条具体可操作的建议，每条一行

## ⏰ 最佳发布时机
- 推荐的发布时间和频率

**格式要求**：
- 每个维度用 ## 标题开头
- 内容用 - 列表，不要长段落
- 总字数控制在 600-900 字
- 只输出中文，不要多余解释`

        const result = streamText({
          model: anthropicProvider(model),
          messages: [{ role: 'user', content: analysisPrompt }],
          maxTokens: 3500,
        })

        let fullAnalysis = ''
        let index = 0

        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            fullAnalysis += part.textDelta
            controller.enqueue(
              sseFrame('delta', { type: 'delta', text: part.textDelta, index })
            )
            index++
          } else if (part.type === 'error') {
            throw part.error
          }
        }

        const usage = await result.usage

        // Persist completed assistant message
        if (assistantMsg?.id) {
          await supabase
            .from('messages')
            .update({
              content: fullAnalysis,
              metadata: {
                agent_type: 'radar' as AgentType,
                model,
                tokens_used: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
                radar_result_id: radarResultId!,
                search_query: query,
              },
            })
            .eq('id', assistantMsg.id)
        }

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
              input_tokens: usage.promptTokens ?? 0,
              output_tokens: usage.completionTokens ?? 0,
            },
          })
        )
      } catch (analysisErr) {
        const message = analysisErr instanceof Error ? analysisErr.message : 'Claude API error'
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
