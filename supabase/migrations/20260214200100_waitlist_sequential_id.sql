-- Use BEFORE INSERT trigger to always set id = max(id) + 1
-- This ensures sequential IDs from 1 even after all rows are deleted

-- Drop the previous DELETE-based trigger (not reliable via Table Editor)
DROP TRIGGER IF EXISTS waitlist_reset_seq ON waitlist;
DROP FUNCTION IF EXISTS public.reset_waitlist_sequence();

-- New approach: set id on every INSERT
CREATE OR REPLACE FUNCTION public.set_waitlist_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := COALESCE((SELECT MAX(id) FROM waitlist), 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER waitlist_set_id
  BEFORE INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.set_waitlist_sequential_id();
