CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.openclaw_embeddings (
  id bigint PRIMARY KEY,
  doc_title text,
  section_title text,
  content text,
  content_preview text,
  file_path text,
  file_name text,
  category text,
  chunk_index int,
  chunk_total int,
  size int,
  date text,
  embedding vector(768)
);

ALTER TABLE public.openclaw_embeddings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON public.openclaw_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
) RETURNS TABLE(
  id bigint,
  doc_title text,
  section_title text,
  content text,
  content_preview text,
  file_path text,
  file_name text,
  category text,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.doc_title, e.section_title, e.content, e.content_preview,
    e.file_path, e.file_name, e.category,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM openclaw_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
