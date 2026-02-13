-- User feedback on AI responses for search quality improvement
CREATE TABLE chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  user_query TEXT,
  assistant_response TEXT,
  source_count INTEGER,
  language VARCHAR(5),
  ip_hash VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feedback_rating ON chat_feedback (rating);
CREATE INDEX idx_feedback_created_at ON chat_feedback (created_at DESC);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
