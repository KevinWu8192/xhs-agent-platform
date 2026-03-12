/**
 * lib/supabase/database.types.ts
 *
 * Auto-generated Supabase database types.
 *
 * TODO: Regenerate this file with the Supabase CLI after applying migrations:
 *   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/database.types.ts
 *
 * The types below are hand-written stubs that mirror the schema defined in
 * supabase/migrations/001_initial_schema.sql. Replace with the CLI-generated
 * output once the project is linked to a Supabase project.
 */

import type {
  AgentType,
  MessageRole,
  UserPreferences,
  RadarSearchResult,
  MessageMetadata,
} from '../../types'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          xhs_handle: string | null
          preferences: UserPreferences
          ai_api_key: string | null
          ai_base_url: string | null
          ai_model: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          xhs_handle?: string | null
          preferences?: UserPreferences
          ai_api_key?: string | null
          ai_base_url?: string | null
          ai_model?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          xhs_handle?: string | null
          preferences?: UserPreferences
          ai_api_key?: string | null
          ai_base_url?: string | null
          ai_model?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          agent_type: AgentType
          title: string
          summary: string | null
          message_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: AgentType
          title?: string
          summary?: string | null
          message_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: AgentType
          title?: string
          summary?: string | null
          message_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: MessageRole
          content: string
          metadata: MessageMetadata | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: MessageRole
          content: string
          metadata?: MessageMetadata | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: MessageRole
          content?: string
          metadata?: MessageMetadata | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          }
        ]
      }
      radar_results: {
        Row: {
          id: string
          user_id: string
          query: string
          results: RadarSearchResult
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          results: RadarSearchResult
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          results?: RadarSearchResult
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      cleanup_expired_radar_results: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: Record<string, never>
  }
}
