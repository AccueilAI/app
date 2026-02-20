-- Add survey columns to waitlist table (nullable for existing rows)
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS admin_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS desired_feature TEXT;
