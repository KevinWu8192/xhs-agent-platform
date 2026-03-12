/**
 * app/api/settings/route.ts
 *
 * GET  /api/settings — returns current user's AI settings (api_key masked)
 * PUT  /api/settings — updates current user's AI settings
 *
 * GET Response:
 *   { baseUrl: string | null, model: string, hasCustomKey: boolean, keyPreview: string | null }
 *
 * PUT Body:
 *   { baseUrl?: string, model?: string, apiKey?: string }
 *   - If apiKey is empty string, clears the custom key (falls back to env var)
 *   - If apiKey is non-empty, stores the new key
 *
 * PUT Response:
 *   { success: true }
 */

import { NextRequest } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { DEFAULT_MODEL } from '@/lib/claude'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Masks an API key to show only the first 6 and last 2 characters.
 * Example: "sk-ant-api03-ABCDEFGH" → "sk-ant****GH"
 * Falls back gracefully for short keys.
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return '****'
  }
  const prefix = key.slice(0, 6)
  const suffix = key.slice(-2)
  return `${prefix}****${suffix}`
}

/**
 * Validates that a base URL is either https:// or http://localhost.
 * Returns an error message string if invalid, null if valid.
 */
function validateBaseUrl(url: string): string | null {
  if (!url) return null // empty is fine (means "clear")
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') return null
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') return null
    return 'baseUrl must start with https:// or http://localhost'
  } catch {
    return 'baseUrl is not a valid URL'
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('ai_api_key, ai_base_url, ai_model')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    // Profile may not exist yet; return defaults
    return Response.json({
      baseUrl: null,
      model: DEFAULT_MODEL,
      hasCustomKey: false,
      keyPreview: null,
    })
  }

  const hasCustomKey = !!profile.ai_api_key
  const keyPreview = profile.ai_api_key ? maskApiKey(profile.ai_api_key) : null

  return Response.json({
    baseUrl: profile.ai_base_url ?? null,
    model: profile.ai_model ?? DEFAULT_MODEL,
    hasCustomKey,
    keyPreview,
  })
}

// ---------------------------------------------------------------------------
// PUT /api/settings
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { baseUrl?: string; model?: string; apiKey?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 422 }
    )
  }

  const { baseUrl, model, apiKey } = body

  // Validate baseUrl if provided
  if (baseUrl !== undefined && baseUrl !== '') {
    const urlError = validateBaseUrl(baseUrl)
    if (urlError) {
      return Response.json(
        { error: urlError },
        { status: 422 }
      )
    }
  }

  // Validate model length if provided
  if (model !== undefined && model.length > 100) {
    return Response.json(
      { error: 'model must be at most 100 characters' },
      { status: 422 }
    )
  }

  // Validate baseUrl length if provided
  if (baseUrl !== undefined && baseUrl.length > 500) {
    return Response.json(
      { error: 'baseUrl must be at most 500 characters' },
      { status: 422 }
    )
  }

  // Build update payload
  const updatePayload: {
    ai_base_url?: string | null
    ai_model?: string | null
    ai_api_key?: string | null
  } = {}

  if (baseUrl !== undefined) {
    updatePayload.ai_base_url = baseUrl === '' ? null : baseUrl
  }

  if (model !== undefined) {
    updatePayload.ai_model = model === '' ? null : model
  }

  if (apiKey !== undefined) {
    // Empty string means "clear the key"; non-empty means "set new key"
    updatePayload.ai_api_key = apiKey === '' ? null : apiKey
  }

  const supabase = createClient()

  // Upsert: update if profile exists, otherwise it's a no-op that won't create
  // (profiles are created by the auth trigger on sign-up)
  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', user.id)

  if (error) {
    return Response.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }

  return Response.json({ success: true })
}
