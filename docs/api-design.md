# XHS博主助手平台 — API Design

**Version**: 1.0
**Base URL**: `/api`
**Auth**: All endpoints require a valid Supabase session cookie (`sb-access-token`). The middleware validates the JWT and injects `userId` into the request context.

---

## Common Conventions

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <supabase_jwt>   (or set via cookie automatically)
```

### Successful Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "request_id": "uuid-v4",
    "timestamp": "2026-03-12T10:00:00Z",
    "duration_ms": 142
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { "field": "reason" }
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Authenticated but no access to resource |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid request body/params |
| `RATE_LIMITED` | 429 | Too many requests |
| `UPSTREAM_ERROR` | 502 | Claude API or external service failure |
| `STREAM_ERROR` | 500 | Error mid-stream; sent as SSE error event |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Agent Routes

### POST /api/agents/radar

**信息雷达** — Search XHS notes and return AI-powered trend analysis.

**Streaming**: Yes — Server-Sent Events (SSE)
**Content-Type Response**: `text/event-stream`

#### Request Body
```typescript
{
  query: string            // Required. Search terms, max 500 chars
  conversation_id?: string // Optional. Append to existing conversation
  filters?: {
    min_likes?: number
    min_comments?: number
    date_from?: string     // ISO 8601
    date_to?: string       // ISO 8601
    tags?: string[]        // Max 10 tags
  }
  limit?: number           // Default: 20, max: 50
}
```

#### Request Example
```json
{
  "query": "夏日穿搭 ins风",
  "filters": { "min_likes": 500 },
  "limit": 20
}
```

#### SSE Stream Events
```
// Event 1: Stream start — returns conversation/message IDs
data: {"event":"start","data":{"conversation_id":"uuid","message_id":"uuid"}}

// Event 2..N: Text delta chunks
data: {"event":"delta","data":{"type":"delta","text":"根据最新","index":0}}

// Final event: Completion with token usage
data: {"event":"done","data":{"type":"done","message_id":"uuid","conversation_id":"uuid","usage":{"input_tokens":320,"output_tokens":850}}}

// Error event (replaces done if stream fails)
data: {"event":"error","data":{"type":"error","code":"UPSTREAM_ERROR","message":"Claude API unavailable"}}
```

#### Error Codes (non-streaming errors returned as JSON before stream opens)
- `401 UNAUTHORIZED` — Not authenticated
- `422 VALIDATION_ERROR` — Missing `query` or invalid `filters`
- `429 RATE_LIMITED` — Exceeded request quota

#### Cache Behavior
- Results are cached in `radar_results` table for **24 hours** per `(user_id, query)`.
- Cache hit: `cached: true` in the embedded `RadarSearchResult`.
- Cache miss: performs live search, stores result.

---

### POST /api/agents/script

**脚本口播** — Generate structured video scripts for XHS content.

**Streaming**: Yes — Server-Sent Events (SSE)
**Content-Type Response**: `text/event-stream`

#### Request Body
```typescript
{
  topic: string              // Required. Script topic, max 200 chars
  style: 'lifestyle' | 'beauty' | 'food' | 'tech'  // Required
  duration_seconds?: number  // Default: 60, range: 15–300
  key_points?: string[]      // Optional. Max 5 bullet points
  target_audience?: string   // Optional. Max 100 chars
  tone?: 'casual' | 'professional' | 'energetic' | 'warm'  // Default: casual
  conversation_id?: string   // Optional. Continue existing conversation
  reference_note_ids?: string[] // Optional. XHSNote IDs from radar results
}
```

#### Request Example
```json
{
  "topic": "夏日清凉防晒穿搭",
  "style": "lifestyle",
  "duration_seconds": 60,
  "tone": "energetic",
  "key_points": ["轻薄透气", "UV防护", "显瘦"]
}
```

#### SSE Stream Events
Same event format as `/api/agents/radar`. The final assembled `GeneratedScript` is embedded in the message metadata stored in the database (accessible via the conversations API after stream completes).

#### Error Codes
- `401 UNAUTHORIZED`
- `422 VALIDATION_ERROR` — Missing `topic` or `style`, invalid `duration_seconds`
- `429 RATE_LIMITED`
- `502 UPSTREAM_ERROR` — Claude API failure

---

## Conversation Routes

### GET /api/conversations

List the authenticated user's conversations, sorted by most recently updated.

**Streaming**: No

#### Query Parameters
```
agent_type?: 'radar' | 'script'  // Filter by agent
page?:        number              // Default: 1
limit?:       number              // Default: 20, max: 50
```

#### Response Body
```typescript
ApiResponse<PaginatedResponse<Conversation>>
```

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "agent_type": "radar",
        "title": "夏日穿搭趋势分析",
        "summary": null,
        "message_count": 4,
        "created_at": "2026-03-12T09:00:00Z",
        "updated_at": "2026-03-12T09:15:00Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "has_more": false,
    "next_cursor": null
  },
  "error": null
}
```

#### Error Codes
- `401 UNAUTHORIZED`

---

### POST /api/conversations

Create a new conversation manually (agents also create conversations implicitly on first message).

**Streaming**: No

#### Request Body
```typescript
{
  agent_type: 'radar' | 'script'  // Required
  title?: string                   // Default: "New Conversation", max 200 chars
}
```

#### Response Body
```typescript
ApiResponse<Conversation>
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "agent_type": "script",
    "title": "New Conversation",
    "summary": null,
    "message_count": 0,
    "created_at": "2026-03-12T10:00:00Z",
    "updated_at": "2026-03-12T10:00:00Z"
  },
  "error": null
}
```

#### Error Codes
- `401 UNAUTHORIZED`
- `422 VALIDATION_ERROR` — Invalid `agent_type`

---

### GET /api/conversations/[id]

Retrieve a conversation with its full message history.

**Streaming**: No

#### Path Parameters
- `id`: UUID of the conversation

#### Query Parameters
```
page?:  number   // Default: 1 (messages page)
limit?: number   // Default: 50, max: 100
```

#### Response Body
```typescript
ApiResponse<{
  conversation: Conversation
  messages: PaginatedResponse<AgentMessage>
}>
```

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "uuid",
      "agent_type": "radar",
      "title": "夏日穿搭趋势",
      "message_count": 3,
      "created_at": "2026-03-12T09:00:00Z",
      "updated_at": "2026-03-12T09:20:00Z"
    },
    "messages": {
      "items": [
        {
          "id": "uuid",
          "conversation_id": "uuid",
          "role": "user",
          "content": "帮我分析一下最近夏日穿搭的趋势",
          "metadata": null,
          "created_at": "2026-03-12T09:00:00Z"
        },
        {
          "id": "uuid",
          "conversation_id": "uuid",
          "role": "assistant",
          "content": "根据最新的小红书数据...",
          "metadata": {
            "agent_type": "radar",
            "tokens_used": 950,
            "model": "claude-sonnet-4-6",
            "radar_result_id": "uuid"
          },
          "created_at": "2026-03-12T09:00:05Z"
        }
      ],
      "total": 3,
      "page": 1,
      "limit": 50,
      "has_more": false,
      "next_cursor": null
    }
  },
  "error": null
}
```

#### Error Codes
- `401 UNAUTHORIZED`
- `403 FORBIDDEN` — Conversation belongs to a different user
- `404 NOT_FOUND` — Conversation does not exist

---

## Implementation Notes for Frontend

### Consuming SSE Streams

```typescript
const response = await fetch('/api/agents/radar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const lines = decoder.decode(value).split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const chunk: StreamChunk = JSON.parse(line.slice(6))
      // handle chunk.event === 'delta' | 'done' | 'error'
    }
  }
}
```

### Auth Flow

1. Use `@supabase/ssr` client-side to manage sessions.
2. All API routes read the session from the `sb-access-token` cookie (set by Supabase Auth).
3. Middleware at `middleware.ts` refreshes expired tokens automatically.
4. On `401`, redirect user to `/login`.

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /api/agents/*` | 20 requests/minute per user |
| `GET /api/conversations*` | 60 requests/minute per user |

Limits are enforced at the middleware level using `userId` as the key.
