-- URL Health Check tracking for automated freshness monitoring
CREATE TABLE url_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  source TEXT NOT NULL,
  status_code INTEGER,
  is_available BOOLEAN NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_health_checked_at ON url_health_checks (checked_at);
CREATE INDEX idx_health_source ON url_health_checks (source);

ALTER TABLE url_health_checks ENABLE ROW LEVEL SECURITY;
