/**
 * app/api/agents/script/route.ts
 *
 * POST /api/agents/script
 *
 * 脚本口播 Agent — generates a structured XHS video script for a given topic.
 * Streams the response via Server-Sent Events (SSE).
 *
 * SSE event format:
 *   data: {"event":"start",  "data":{"conversation_id":"uuid","message_id":"uuid"}}
 *   data: {"event":"delta",  "data":{"type":"delta","text":"...","index":0}}
 *   data: {"event":"done",   "data":{"type":"done","message_id":"uuid","conversation_id":"uuid","usage":{...}}}
 *   data: {"event":"error",  "data":{"type":"error","code":"UPSTREAM_ERROR","message":"..."}}
 */

import { NextRequest } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { createAnthropicClient, resolveModel } from '@/lib/claude'
import type { AgentType, ScriptStyle, ScriptTone } from '@/types'

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------
interface ScriptRequestBody {
  topic: string
  style: ScriptStyle
  duration_seconds?: number
  key_points?: string[]
  target_audience?: string
  tone?: ScriptTone
  conversation_id?: string
  reference_note_ids?: string[]
}

// ---------------------------------------------------------------------------
// Style descriptions for system prompt
// ---------------------------------------------------------------------------
function getStyleDescription(style: ScriptStyle): string {
  const styles: Record<ScriptStyle, string> = {
    lifestyle: '生活方式类，温暖治愈，贴近日常',
    beauty: '美妆美容类，专业种草，突出效果',
    food: '美食探店类，食欲感强，有场景感',
    tech: '数码科技类，理性客观，突出性能参数',
  }
  return styles[style] ?? '通用风格，亲切自然'
}

// ---------------------------------------------------------------------------
// SSE encoder helpers
// ---------------------------------------------------------------------------
const encoder = new TextEncoder()

function sseFrame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
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
  let body: ScriptRequestBody
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

  const { topic, style, duration_seconds, key_points, target_audience, tone, conversation_id } =
    body

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return Response.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'topic is required' },
      },
      { status: 422 }
    )
  }

  const validStyles: ScriptStyle[] = ['lifestyle', 'beauty', 'food', 'tech']
  if (!style || !validStyles.includes(style)) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: `style must be one of: ${validStyles.join(', ')}`,
        },
      },
      { status: 422 }
    )
  }

  const duration = duration_seconds ?? 60
  if (duration < 15 || duration > 300) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'duration_seconds must be between 15 and 300',
        },
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

  const client = createAnthropicClient(userAISettings)
  const model = resolveModel(userAISettings)

  let convId = conversation_id ?? null

  if (!convId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        agent_type: 'script' as AgentType,
        title: `脚本：${topic.slice(0, 50)}`,
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
  const userContent = `请为「${topic}」写一篇小红书视频脚本`
  await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      role: 'user' as const,
      content: userContent,
      metadata: null,
    })

  // Pre-create assistant message placeholder to get an ID
  const { data: assistantMsg } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      role: 'assistant' as const,
      content: '',
      metadata: {
        agent_type: 'script' as AgentType,
        model,
      },
    })
    .select()
    .single()

  const messageId = assistantMsg?.id ?? crypto.randomUUID()

  // 4. Build system prompt
  const toneDescription =
    tone === 'professional'
      ? '专业可信，有调性'
      : tone === 'energetic'
        ? '充满活力，激情四射'
        : tone === 'warm'
          ? '温暖亲切，有温度'
          : '轻松活泼，接地气'

  const keyPointsSection =
    key_points && key_points.length > 0
      ? `\n核心卖点：${key_points.join('、')}`
      : ''

  const audienceSection = target_audience
    ? `\n目标人群：${target_audience}`
    : ''

  const systemPrompt = `你是一位专业的小红书内容创作者，擅长写爆款视频脚本和口播文案。
风格要求：${getStyleDescription(style)}
语气：${toneDescription}
视频时长：约 ${duration} 秒${keyPointsSection}${audienceSection}

请按以下格式输出脚本：
【开场钩子】（3-5秒，抓住眼球）
【主体内容】（分3-5个段落，每段有小标题）
【结尾行动】（引导点赞收藏关注）
【配套标题】（3个备选封面标题）
【推荐标签】（10个相关话题标签）`

  // 5. Stream from Claude
  const readable = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          sseFrame('start', {
            conversation_id: convId,
            message_id: messageId,
          })
        )

        const stream = await client.messages.stream({
          model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        })

        let fullText = ''
        let index = 0

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullText += text
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
              content: fullText,
              metadata: {
                agent_type: 'script' as AgentType,
                model,
                tokens_used: usage.input_tokens + usage.output_tokens,
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
