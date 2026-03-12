-- Migration: 002_ai_settings
-- Add AI settings columns to profiles table
-- These columns allow users to configure their own AI provider (key, base URL, model)

-- Add AI settings columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_api_key   TEXT,
  ADD COLUMN IF NOT EXISTS ai_base_url  TEXT,
  ADD COLUMN IF NOT EXISTS ai_model     TEXT DEFAULT 'claude-sonnet-4.6';

-- Constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ai_model_length    CHECK (char_length(ai_model) <= 100),
  ADD CONSTRAINT profiles_ai_base_url_length CHECK (char_length(ai_base_url) <= 500);

-- Note: ai_api_key is stored server-side only, protected by RLS
-- The GET /api/settings endpoint NEVER returns the actual key, only a masked version
