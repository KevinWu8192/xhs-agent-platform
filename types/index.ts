// =============================================================================
// XHS博主助手平台 — Global TypeScript Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// User & Auth Types
// -----------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  xhs_handle: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  default_script_style: ScriptStyle
  language: 'zh' | 'en'
  notifications_enabled: boolean
}

// -----------------------------------------------------------------------------
// Agent Core Types
// -----------------------------------------------------------------------------

export type AgentType = 'radar' | 'script'

export interface Agent {
  type: AgentType
  name: string
  description: string
  capabilities: string[]
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface AgentMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  metadata: MessageMetadata | null
  created_at: string
}

export interface MessageMetadata {
  agent_type: AgentType
  tokens_used?: number
  model?: string
  radar_result_id?: string
  script_sections?: ScriptSection[]
  search_query?: string
  duration_ms?: number
}

export interface Conversation {
  id: string
  user_id: string
  agent_type: AgentType
  title: string
  summary: string | null
  message_count: number
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// 信息雷达 Agent Types
// -----------------------------------------------------------------------------

export interface XHSNote {
  id: string
  title: string
  author: string
  author_id: string
  content_preview: string
  likes: number
  comments: number
  shares: number
  tags: string[]
  cover_image_url: string | null
  note_url: string
  published_at: string
  collected_at: string
}

export interface RadarSearchResult {
  id: string
  query: string
  notes: XHSNote[]
  trending_tags: string[]
  total_found: number
  search_time_ms: number
  cached: boolean
  expires_at: string
}

export interface RadarRequest {
  query: string
  conversation_id?: string
  filters?: RadarFilters
  limit?: number
}

export interface RadarFilters {
  min_likes?: number
  min_comments?: number
  date_from?: string
  date_to?: string
  tags?: string[]
}

export interface RadarResponse {
  conversation_id: string
  message_id: string
  result: RadarSearchResult
  analysis: string
  suggestions: string[]
}

// -----------------------------------------------------------------------------
// 脚本口播 Agent Types
// -----------------------------------------------------------------------------

export type ScriptStyle = 'lifestyle' | 'beauty' | 'food' | 'tech'

export interface ScriptSection {
  order: number
  type: ScriptSectionType
  title: string
  content: string
  duration_seconds: number
  tips: string[]
}

export type ScriptSectionType =
  | 'hook'
  | 'intro'
  | 'main_content'
  | 'demo'
  | 'cta'
  | 'outro'

export interface ScriptRequest {
  topic: string
  style: ScriptStyle
  duration_seconds?: number
  key_points?: string[]
  target_audience?: string
  tone?: ScriptTone
  conversation_id?: string
  reference_note_ids?: string[]
}

export type ScriptTone = 'casual' | 'professional' | 'energetic' | 'warm'

export interface ScriptResponse {
  conversation_id: string
  message_id: string
  script: GeneratedScript
}

export interface GeneratedScript {
  title: string
  style: ScriptStyle
  total_duration_seconds: number
  sections: ScriptSection[]
  full_text: string
  hashtags: string[]
  posting_tips: string[]
  created_at: string
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: null
  meta?: ResponseMeta
}

export interface ApiErrorResponse {
  success: false
  data: null
  error: ErrorResponse
  meta?: ResponseMeta
}

export interface ResponseMeta {
  request_id: string
  timestamp: string
  duration_ms: number
}

export interface ErrorResponse {
  code: ErrorCode
  message: string
  details?: Record<string, string>
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'STREAM_ERROR'
  | 'INTERNAL_ERROR'

// -----------------------------------------------------------------------------
// Streaming Types
// -----------------------------------------------------------------------------

export type StreamEventType =
  | 'start'
  | 'delta'
  | 'tool_use'
  | 'tool_result'
  | 'done'
  | 'error'

export interface StreamChunk {
  event: StreamEventType
  data: StreamDeltaData | StreamDoneData | StreamErrorData
}

export interface StreamDeltaData {
  type: 'delta'
  text: string
  index: number
}

export interface StreamDoneData {
  type: 'done'
  message_id: string
  conversation_id: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface StreamErrorData {
  type: 'error'
  code: ErrorCode
  message: string
}

// -----------------------------------------------------------------------------
// Database Row Types (matches Supabase schema exactly)
// -----------------------------------------------------------------------------

export interface ProfileRow {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  xhs_handle: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: string
  user_id: string
  agent_type: AgentType
  title: string
  summary: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  metadata: MessageMetadata | null
  created_at: string
}

export interface RadarResultRow {
  id: string
  user_id: string
  query: string
  results: RadarSearchResult
  expires_at: string
  created_at: string
}

// -----------------------------------------------------------------------------
// Request/Response helpers for API routes
// -----------------------------------------------------------------------------

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
  next_cursor: string | null
}

export type ConversationListResponse = PaginatedResponse<Conversation>
export type MessageListResponse = PaginatedResponse<AgentMessage>
