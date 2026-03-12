-- Remote migration placeholder fetched from linked project history.
-- Already applied on project vbejswywswaeyfasnwjq before this repo was linked.

-- Add tags and source columns to openclaw_embeddings for metadata filtering
ALTER TABLE openclaw_embeddings ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;
ALTER TABLE openclaw_embeddings ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_embeddings_tags ON openclaw_embeddings USING GIN (tags);

-- Index on source for filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON openclaw_embeddings (source);
