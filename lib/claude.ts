/**
 * lib/claude.ts
 *
 * Anthropic Claude AI client and SSE streaming utilities.
 * Server-side only — do not import in client components.
 */

import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Client singleton (lazy — only created when env var is available)
// ---------------------------------------------------------------------------

// Default model — overridable via environment variable
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

/**
 * Lazy singleton: returns a shared Anthropic client backed by env vars.
 * Returns null if ANTHROPIC_API_KEY is not set.
 * Use createAnthropicClient() in request handlers instead of this directly.
 */
let _defaultClient: Anthropic | null = null
export function getDefaultClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_defaultClient) {
    _defaultClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(process.env.ANTHROPIC_BASE_URL && { baseURL: process.env.ANTHROPIC_BASE_URL }),
    })
  }
  return _defaultClient
}

// ---------------------------------------------------------------------------
// Missing API key error
// ---------------------------------------------------------------------------

export class MissingAPIKeyError extends Error {
  constructor() {
    super('NO_API_KEY_CONFIGURED')
    this.name = 'MissingAPIKeyError'
  }
}

// ---------------------------------------------------------------------------
// Per-user client factory (for custom API URL / key / model from settings)
// ---------------------------------------------------------------------------

export interface UserAISettings {
  apiKey?: string | null
  baseUrl?: string | null
  model?: string | null
}

/**
 * Returns an Anthropic client configured with the user's custom settings,
 * falling back to environment variables if not set.
 * Throws MissingAPIKeyError if neither the user nor the environment provides a key.
 */
export function createAnthropicClient(userSettings?: UserAISettings | null): Anthropic {
  const apiKey = userSettings?.apiKey || process.env.ANTHROPIC_API_KEY
  const baseURL = userSettings?.baseUrl || process.env.ANTHROPIC_BASE_URL

  if (!apiKey) {
    throw new MissingAPIKeyError()
  }

  return new Anthropic({
    apiKey,
    ...(baseURL && { baseURL }),
  })
}

/**
 * Resolves the model to use: user setting → env var → hardcoded default
 */
export function resolveModel(userSettings?: UserAISettings | null): string {
  return userSettings?.model || DEFAULT_MODEL
}

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
