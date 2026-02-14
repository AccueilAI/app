-- Extend profiles table with immigration-specific fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS visa_type TEXT,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS prefecture TEXT;
