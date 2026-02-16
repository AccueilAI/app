-- Recrawl candidates: URLs flagged for re-crawling
CREATE TABLE recrawl_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  chunk_id UUID REFERENCES document_chunks(id),
  reason TEXT NOT NULL CHECK (reason IN ('content_changed','url_unavailable','manual_flag','rss_alert')),
  detected_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

CREATE INDEX idx_recrawl_processed ON recrawl_candidates (processed, detected_at);
CREATE INDEX idx_recrawl_source ON recrawl_candidates (source);

ALTER TABLE recrawl_candidates ENABLE ROW LEVEL SECURITY;
