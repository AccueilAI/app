-- Deadline tracker table for administrative deadline management
CREATE TABLE public.deadlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline_type TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  description TEXT,
  days_before_reminder INTEGER DEFAULT 7,
  reminder_sent BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deadlines"
  ON deadlines FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on deadlines"
  ON deadlines FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON deadlines TO authenticated;

CREATE INDEX idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX idx_deadlines_date ON deadlines(deadline_date);
CREATE INDEX idx_deadlines_reminder ON deadlines(reminder_sent, deadline_date)
  WHERE NOT completed AND NOT reminder_sent;

CREATE TRIGGER deadlines_updated_at
  BEFORE UPDATE ON deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
