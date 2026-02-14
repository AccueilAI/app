-- document_analyses table: stores AI analysis results of uploaded documents
CREATE TABLE public.document_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  analysis TEXT NOT NULL,
  checklist JSONB,
  document_type TEXT,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own analyses"
  ON document_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own analyses"
  ON document_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on document_analyses"
  ON document_analyses FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT ON document_analyses TO authenticated;

CREATE INDEX idx_document_analyses_user_id ON document_analyses(user_id);
CREATE INDEX idx_document_analyses_created_at ON document_analyses(created_at DESC);
