-- Extend profiles with fields needed for full benefits eligibility matching
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'unknown'
    CHECK (employment_status IN ('employed', 'unemployed', 'student', 'retired', 'self_employed', 'unknown'));
