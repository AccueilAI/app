-- Search RPC Freshness: Add last_crawled_at to hybrid_search and vector_search return types
-- Must DROP first because PostgreSQL cannot change return type via CREATE OR REPLACE

DROP FUNCTION IF EXISTS hybrid_search(TEXT, vector(1024), INT, INT, TEXT, TEXT, TEXT);

CREATE FUNCTION hybrid_search(
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
  rrf_score FLOAT,
  last_crawled_at TIMESTAMPTZ
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
    f.rrf_score::FLOAT,
    dc.last_crawled_at
  FROM fused f
  JOIN document_chunks dc ON dc.id = f.id
  ORDER BY f.rrf_score DESC;
$$;

DROP FUNCTION IF EXISTS vector_search(vector(1024), INT, TEXT, TEXT, TEXT);

CREATE FUNCTION vector_search(
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
  similarity FLOAT,
  last_crawled_at TIMESTAMPTZ
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
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity,
    dc.last_crawled_at
  FROM document_chunks dc
  WHERE dc.language = filter_language
    AND (filter_source IS NULL OR dc.source = filter_source)
    AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
