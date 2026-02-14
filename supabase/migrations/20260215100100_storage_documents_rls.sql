-- Storage RLS for documents bucket
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role full access on documents storage"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'documents');
