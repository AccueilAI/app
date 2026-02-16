-- Extend chat_feedback for structured feedback types
ALTER TABLE chat_feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT DEFAULT 'accuracy'
  CHECK (feedback_type IN ('accuracy','outdated','other'));
ALTER TABLE chat_feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE chat_feedback ADD COLUMN IF NOT EXISTS source_urls TEXT[];

-- Aggregation view for outdated source reports
CREATE OR REPLACE VIEW outdated_reports_summary AS
SELECT
  unnest(source_urls) as source_url,
  COUNT(*) as report_count,
  MAX(created_at) as last_reported
FROM chat_feedback
WHERE feedback_type = 'outdated' AND created_at > now() - interval '30 days'
GROUP BY unnest(source_urls)
HAVING COUNT(*) >= 3;
