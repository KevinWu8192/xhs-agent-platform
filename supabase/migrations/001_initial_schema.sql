-- =============================================================================
-- XHS博主助手平台 — Initial Database Schema
-- Migration: 001_initial_schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search on queries

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: profiles
-- Extends auth.users with XHS platform-specific user data
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  xhs_handle    TEXT,
  preferences   JSONB NOT NULL DEFAULT '{
    "default_script_style": "lifestyle",
    "language": "zh",
    "notifications_enabled": true
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100),
  CONSTRAINT profiles_bio_length          CHECK (char_length(bio) <= 500),
  CONSTRAINT profiles_xhs_handle_length   CHECK (char_length(xhs_handle) <= 50)
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: conversations
-- Stores chat sessions per agent type
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type    TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT 'New Conversation',
  summary       TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_agent_type_values CHECK (agent_type IN ('radar', 'script')),
  CONSTRAINT conversations_title_length      CHECK (char_length(title) <= 200),
  CONSTRAINT conversations_message_count_min CHECK (message_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id    ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_type ON public.conversations(agent_type);
CREATE INDEX IF NOT EXISTS idx_conversations_user_agent ON public.conversations(user_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: messages
-- Individual messages within a conversation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT messages_role_values    CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT messages_content_length CHECK (char_length(content) <= 100000)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created    ON public.messages(conversation_id, created_at ASC);
-- Index for querying by agent_type stored inside metadata
CREATE INDEX IF NOT EXISTS idx_messages_metadata_agent_type
  ON public.messages USING gin((metadata -> 'agent_type'));

-- Auto-increment message_count on conversations when a message is inserted
CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    message_count = message_count + 1,
    updated_at    = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION increment_conversation_message_count();

-- Decrement when deleted
CREATE OR REPLACE FUNCTION decrement_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    message_count = GREATEST(0, message_count - 1),
    updated_at    = NOW()
  WHERE id = OLD.conversation_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_delete_update_conversation
  AFTER DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION decrement_conversation_message_count();

-- =============================================================================
-- TABLE: radar_results
-- Cache for 信息雷达 search results (avoid repeated API calls)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.radar_results (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  results    JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT radar_results_query_length CHECK (char_length(query) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_radar_results_user_id   ON public.radar_results(user_id);
CREATE INDEX IF NOT EXISTS idx_radar_results_expires_at ON public.radar_results(expires_at);
-- Trigram index for fuzzy query matching (cache lookup)
CREATE INDEX IF NOT EXISTS idx_radar_results_query_trgm
  ON public.radar_results USING gin(query gin_trgm_ops);
-- Composite index: look up cache by user+query, filter expired in app layer
CREATE INDEX IF NOT EXISTS idx_radar_results_user_query_active
  ON public.radar_results(user_id, query, expires_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only access their own data
-- =============================================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_results  ENABLE ROW LEVEL SECURITY;

-- -------------------------------------
-- profiles policies
-- -------------------------------------

CREATE POLICY "profiles: users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles: users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles: users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------
-- conversations policies
-- -------------------------------------

CREATE POLICY "conversations: users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations: users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------
-- messages policies
-- Users access messages only for conversations they own
-- -------------------------------------

CREATE POLICY "messages: users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "messages: users can insert messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "messages: users can delete messages in own conversations"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- -------------------------------------
-- radar_results policies
-- -------------------------------------

CREATE POLICY "radar_results: users can view own results"
  ON public.radar_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "radar_results: users can insert own results"
  ON public.radar_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "radar_results: users can delete own results"
  ON public.radar_results FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- Triggered by Supabase Auth when a new user registers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- CLEANUP: Remove expired radar cache (run via pg_cron or scheduled job)
-- =============================================================================

-- Function that can be called by a scheduled job or cron
CREATE OR REPLACE FUNCTION public.cleanup_expired_radar_results()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.radar_results
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANTS
-- Allow the anon and authenticated roles appropriate access
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.messages      TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.radar_results TO authenticated;

-- Service role bypass (used by server-side API routes with SUPABASE_SERVICE_ROLE_KEY)
-- No additional grants needed; service role bypasses RLS by default.
