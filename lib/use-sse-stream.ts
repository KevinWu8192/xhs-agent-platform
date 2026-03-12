/**
 * lib/use-sse-stream.ts
 *
 * useSSEStream — 通用 SSE 流处理 hook
 *
 * 支持:
 * - 发起 POST 请求启动流
 * - 实时 append streaming text
 * - 解析 JSON data 行
 * - 处理 [DONE] 结束信号
 * - loading/error 状态管理
 * - 流中断时 abort（组件 unmount）
 */

import { useCallback, useRef } from 'react'

export interface SSEStreamOptions<TEvent extends string = string> {
  /** API endpoint to POST to */
  url: string
  /** Called when a parsed SSE event arrives */
  onEvent: (event: TEvent, data: unknown) => void
  /** Called when the stream completes */
  onDone?: () => void
  /** Called on error */
  onError?: (err: string) => void
}

export interface SSEStreamControls {
  /** Start the SSE stream by POSTing the given body */
  start: (body: unknown) => Promise<void>
  /** Abort in-flight stream */
  abort: () => void
}

export function useSSEStream<TEvent extends string = string>(
  options: SSEStreamOptions<TEvent>
): SSEStreamControls {
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(
    async (body: unknown) => {
      // Abort any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          options.onError?.(
            `HTTP ${response.status}: ${errorText || response.statusText}`
          )
          return
        }

        if (!response.body) {
          options.onError?.('Response body is null')
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process all complete lines in the buffer
          const lines = buffer.split('\n')
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue

            const raw = trimmed.slice(6)
            if (raw === '[DONE]') {
              options.onDone?.()
              return
            }

            try {
              const parsed = JSON.parse(raw) as { event: TEvent; data: unknown }
              if (parsed.event) {
                options.onEvent(parsed.event, parsed.data)
                // Handle done event from within SSE envelope
                if (parsed.event === 'done') {
                  options.onDone?.()
                  return
                }
                if (parsed.event === 'error') {
                  const errData = parsed.data as { message?: string }
                  options.onError?.(errData?.message ?? 'Stream error')
                  return
                }
              }
            } catch {
              // Ignore malformed JSON lines
            }
          }
        }

        options.onDone?.()
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          // Intentional abort — not an error
          return
        }
        options.onError?.(err instanceof Error ? err.message : 'Unknown stream error')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.url, options.onEvent, options.onDone, options.onError]
  )

  return { start, abort }
}
