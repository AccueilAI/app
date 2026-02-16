-- document_checklists table: stores AI-generated procedure checklists
CREATE TABLE public.document_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  nationality TEXT,
  visa_type TEXT,
  prefecture TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.document_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checklists"
  ON document_checklists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own checklists"
  ON document_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checklists"
  ON document_checklists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own checklists"
  ON document_checklists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on document_checklists"
  ON document_checklists FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON document_checklists TO authenticated;

CREATE INDEX idx_document_checklists_user_id ON document_checklists(user_id);
CREATE INDEX idx_document_checklists_procedure ON document_checklists(procedure_type);
CREATE INDEX idx_document_checklists_updated ON document_checklists(updated_at DESC);

CREATE TRIGGER document_checklists_updated_at
  BEFORE UPDATE ON document_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
