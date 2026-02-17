-- Add subscription tier to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'plus', 'pro', 'admin')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
