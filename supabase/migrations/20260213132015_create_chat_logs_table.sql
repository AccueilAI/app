-- Chat conversation logs for analytics (not session resumption)
CREATE TABLE chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  language VARCHAR(5) NOT NULL,
  source_count INTEGER NOT NULL,
  ip_hash VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query indexes for analytics
CREATE INDEX idx_chat_logs_created_at ON chat_logs (created_at DESC);
CREATE INDEX idx_chat_logs_language ON chat_logs (language);
CREATE INDEX idx_chat_logs_ip_hash ON chat_logs (ip_hash);

-- RLS: service_role only
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
