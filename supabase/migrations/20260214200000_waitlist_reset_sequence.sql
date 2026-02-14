-- Reset waitlist id sequence after DELETE so ids stay sequential from 1
-- When all rows are deleted, next insert gets id=1 instead of continuing from last value

CREATE OR REPLACE FUNCTION public.reset_waitlist_sequence()
RETURNS TRIGGER AS $$
DECLARE
  max_id bigint;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM waitlist;
  IF max_id = 0 THEN
    -- Table is empty: reset so next insert gets id=1
    PERFORM setval('waitlist_id_seq', 1, false);
  ELSE
    -- Table has rows: set sequence to max id (next insert gets max+1)
    PERFORM setval('waitlist_id_seq', max_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER waitlist_reset_seq
  AFTER DELETE ON waitlist
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.reset_waitlist_sequence();
