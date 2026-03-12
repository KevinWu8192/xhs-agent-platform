/**
 * lib/claude.ts
 *
 * Anthropic Claude AI client and SSE streaming utilities.
 * Server-side only — do not import in client components.
 */

import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model — overridable via environment variable
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

// ---------------------------------------------------------------------------
// SSE streaming helper
// ---------------------------------------------------------------------------

/**
 * Wraps an async generator that yields text chunks into a Server-Sent Events
 * `Response`. Each chunk is emitted as:
 *   `data: {"text":"...chunk..."}\n\n`
 * When the generator is exhausted, a final `data: [DONE]\n\n` frame is sent.
 *
 * @example
 * async function* myGenerator() {
 *   yield 'Hello '
 *   yield 'world!'
 * }
 * return createSSEStream(myGenerator())
 */
export function createSSEStream(generator: AsyncGenerator<string>): Response {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          )
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Stream error occurred'
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: true, message })}\n\n`
          )
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

// ---------------------------------------------------------------------------
// Low-level SSE frame helpers (used by agent routes for richer event types)
// ---------------------------------------------------------------------------

export function encodeSSEEvent(
  event: string,
  data: unknown,
  encoder: TextEncoder
): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
}
