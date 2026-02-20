-- Add 'max' to subscription_tier check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'plus', 'pro', 'max', 'admin'));
