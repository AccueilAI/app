-- Add nullable user_id FK to chat tables for authenticated user tracking
ALTER TABLE chat_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE chat_feedback ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX idx_chat_feedback_user_id ON chat_feedback(user_id);

-- Replace deny-all authenticated policies with user-specific SELECT
DROP POLICY IF EXISTS "Deny authenticated access to chat_logs" ON chat_logs;
CREATE POLICY "Users read own chat logs"
  ON chat_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deny authenticated access to chat_feedback" ON chat_feedback;
CREATE POLICY "Users read own feedback"
  ON chat_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant SELECT to authenticated (was previously revoked)
GRANT SELECT ON chat_logs TO authenticated;
GRANT SELECT ON chat_feedback TO authenticated;
