-- experiences table: community experience data for French admin procedures
CREATE TABLE public.experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL,
  prefecture TEXT,
  city TEXT,
  nationality TEXT,
  visa_type TEXT,
  wait_time_days INTEGER,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  documents_used TEXT[],
  tips TEXT,
  outcome TEXT CHECK (outcome IN ('approved', 'rejected', 'pending', 'other')),
  experience_date DATE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read all experiences"
  ON experiences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own experiences"
  ON experiences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own experiences"
  ON experiences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own experiences"
  ON experiences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on experiences"
  ON experiences FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON experiences TO authenticated;

CREATE INDEX idx_experiences_procedure_type ON experiences(procedure_type);
CREATE INDEX idx_experiences_prefecture ON experiences(prefecture);
CREATE INDEX idx_experiences_user_id ON experiences(user_id);
CREATE INDEX idx_experiences_created_at ON experiences(created_at DESC);

CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
