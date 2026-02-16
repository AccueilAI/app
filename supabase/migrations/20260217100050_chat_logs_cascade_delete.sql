-- Change chat_logs.conversation_id from ON DELETE SET NULL to ON DELETE CASCADE
-- so deleting a conversation also deletes its linked chat_logs
ALTER TABLE chat_logs DROP CONSTRAINT IF EXISTS chat_logs_conversation_id_fkey;
ALTER TABLE chat_logs
  ADD CONSTRAINT chat_logs_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
