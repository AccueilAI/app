-- Phase 1: Vector DB tables for RAG pipeline
-- Enables hybrid search (pgvector + tsvector) over French legal/administrative content

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- document_chunks: unified vector store for all content types
-- ============================================================
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1024),
  content_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('french', content)
  ) STORED,

  -- Source tracking
  source TEXT NOT NULL,       -- 'legi', 'service-public', 'annuaire', 'france-visas', 'welcome-to-france'
  doc_type TEXT NOT NULL,     -- 'law_article', 'procedure', 'office_info', 'guide', 'visa_info'
  language TEXT DEFAULT 'fr',

  -- Law-specific metadata
  article_id TEXT,            -- LEGI identifier e.g. 'LEGIARTI000...'
  article_number TEXT,        -- Human-readable e.g. 'L421-1'
  code_name TEXT,             -- e.g. 'CESEDA', 'Code du travail'
  hierarchy JSONB,            -- {livre, titre, chapitre, section}
  cross_references TEXT[],    -- Referenced article numbers

  -- Common metadata
  source_url TEXT,
  last_modified TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for vector similarity search (cosine distance)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX idx_chunks_tsv ON document_chunks USING gin (content_tsv);

-- Filter indexes
CREATE INDEX idx_chunks_source ON document_chunks (source);
CREATE INDEX idx_chunks_doc_type ON document_chunks (doc_type);
CREATE INDEX idx_chunks_article_number ON document_chunks (article_number);
CREATE INDEX idx_chunks_code_name ON document_chunks (code_name);
CREATE INDEX idx_chunks_language ON document_chunks (language);
CREATE INDEX idx_chunks_metadata ON document_chunks USING gin (metadata);

-- ============================================================
-- government_offices: structured data for office lookups
-- ============================================================
CREATE TABLE government_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  office_type TEXT NOT NULL,  -- 'prefecture', 'sous_prefecture', 'caf', 'cpam', 'ofii', 'france_travail', 'impots'
  address TEXT,
  city TEXT,
  postal_code TEXT,
  department TEXT,
  region TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  opening_hours JSONB,
  services TEXT[],            -- e.g. ['titre_de_sejour', 'naturalisation']
  metadata JSONB,
  source_id TEXT,             -- Original ID from API Annuaire
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_offices_type ON government_offices (office_type);
CREATE INDEX idx_offices_department ON government_offices (department);
CREATE INDEX idx_offices_city ON government_offices (city);
CREATE INDEX idx_offices_postal_code ON government_offices (postal_code);

-- ============================================================
-- RLS: service_role only (no public access)
-- ============================================================
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_offices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Hybrid search RPC function (Reciprocal Rank Fusion)
-- ============================================================
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(1024),
  match_count INT DEFAULT 10,
  rrf_k INT DEFAULT 60,
  filter_source TEXT DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL,
  filter_language TEXT DEFAULT 'fr'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source TEXT,
  doc_type TEXT,
  article_number TEXT,
  code_name TEXT,
  source_url TEXT,
  metadata JSONB,
  semantic_rank INT,
  keyword_rank INT,
  rrf_score FLOAT
)
LANGUAGE sql STABLE
AS $$
  WITH semantic AS (
    SELECT
      dc.id,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
    FROM document_chunks dc
    WHERE dc.language = filter_language
      AND (filter_source IS NULL OR dc.source = filter_source)
      AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword AS (
    SELECT
      dc.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(dc.content_tsv, websearch_to_tsquery('french', query_text)) DESC
      ) AS rank
    FROM document_chunks dc
    WHERE dc.content_tsv @@ websearch_to_tsquery('french', query_text)
      AND dc.language = filter_language
      AND (filter_source IS NULL OR dc.source = filter_source)
      AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
    LIMIT match_count * 3
  ),
  fused AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      s.rank AS semantic_rank,
      k.rank AS keyword_rank,
      (
        COALESCE(1.0 / (rrf_k + s.rank), 0.0) +
        COALESCE(1.0 / (rrf_k + k.rank), 0.0)
      ) AS rrf_score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
    ORDER BY rrf_score DESC
    LIMIT match_count
  )
  SELECT
    f.id,
    dc.content,
    dc.source,
    dc.doc_type,
    dc.article_number,
    dc.code_name,
    dc.source_url,
    dc.metadata,
    f.semantic_rank::INT,
    f.keyword_rank::INT,
    f.rrf_score::FLOAT
  FROM fused f
  JOIN document_chunks dc ON dc.id = f.id
  ORDER BY f.rrf_score DESC;
$$;

-- Standalone vector search RPC
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1024),
  match_count INT DEFAULT 10,
  filter_source TEXT DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL,
  filter_language TEXT DEFAULT 'fr'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source TEXT,
  doc_type TEXT,
  article_number TEXT,
  code_name TEXT,
  source_url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.source,
    dc.doc_type,
    dc.article_number,
    dc.code_name,
    dc.source_url,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  WHERE dc.language = filter_language
    AND (filter_source IS NULL OR dc.source = filter_source)
    AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
