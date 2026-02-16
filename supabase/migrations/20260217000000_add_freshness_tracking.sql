-- Data Freshness Tracking: Add temporal metadata to core tables

-- document_chunks: crawl timestamp tracking
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_chunks_last_crawled ON document_chunks (last_crawled_at);

-- benefits: verification tracking
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- government_offices: crawl timestamp tracking
ALTER TABLE government_offices ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;

-- Backfill existing data
UPDATE document_chunks SET last_crawled_at = COALESCE(last_modified, created_at) WHERE last_crawled_at IS NULL;
UPDATE government_offices SET last_crawled_at = created_at WHERE last_crawled_at IS NULL;
UPDATE benefits SET last_verified_at = updated_at WHERE last_verified_at IS NULL;
