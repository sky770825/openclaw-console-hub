-- Migration: 知識庫分類閉環 v1.0
-- 新增 status / content_type / expires_at / zone 欄位
-- 升級 match_embeddings RPC 支援三種搜尋模式（task / code / history）

-- 1. 新增分類欄位
ALTER TABLE public.openclaw_embeddings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'expired')),
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'reference'
    CHECK (content_type IN ('soul', 'sop', 'codebase', 'reference', 'diagnosis', 'plan', 'exercise', 'log')),
  ADD COLUMN IF NOT EXISTS zone text DEFAULT 'hot'
    CHECK (zone IN ('hot', 'cold', 'archive')),
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- 2. 搜尋加速索引
CREATE INDEX IF NOT EXISTS idx_embeddings_status
  ON public.openclaw_embeddings (status);

CREATE INDEX IF NOT EXISTS idx_embeddings_zone_status
  ON public.openclaw_embeddings (zone, status);

CREATE INDEX IF NOT EXISTS idx_embeddings_content_type
  ON public.openclaw_embeddings (content_type);

CREATE INDEX IF NOT EXISTS idx_embeddings_expires_at
  ON public.openclaw_embeddings (expires_at)
  WHERE expires_at IS NOT NULL;

-- 3. 批次初始化現有 chunks（依 category 推斷 zone / content_type / is_pinned）
UPDATE public.openclaw_embeddings SET
  zone = CASE
    WHEN category IN ('identity', 'soul', 'instruction', 'codebase', 'cookbook', 'sop', 'memory', 'tools', 'learning') THEN 'hot'
    WHEN category IN ('reports', 'proposals') THEN 'cold'
    ELSE 'hot'
  END,
  content_type = CASE
    WHEN category = 'identity' OR category = 'soul' THEN 'soul'
    WHEN category IN ('cookbook', 'sop', 'instruction') THEN 'sop'
    WHEN category = 'codebase' THEN 'codebase'
    WHEN category = 'reports' THEN 'diagnosis'
    WHEN category = 'proposals' THEN 'plan'
    WHEN category = 'learning' THEN 'exercise'
    ELSE 'reference'
  END,
  is_pinned = CASE
    WHEN file_name IN ('SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'AWAKENING.md', 'CONSCIOUSNESS_ANCHOR.md') THEN true
    ELSE false
  END,
  status = 'active'
WHERE status IS NULL OR status = '';

-- 4. 升級 match_embeddings RPC — 支援三種搜尋模式
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  search_mode text DEFAULT 'task'  -- 'task' | 'code' | 'history'
) RETURNS TABLE(
  id bigint,
  doc_title text,
  section_title text,
  content text,
  content_preview text,
  file_path text,
  file_name text,
  category text,
  zone text,
  content_type text,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.doc_title, e.section_title, e.content, e.content_preview,
    e.file_path, e.file_name, e.category, e.zone, e.content_type,
    (1 - (e.embedding <=> query_embedding)) AS similarity
  FROM openclaw_embeddings e
  WHERE
    -- 封存區永遠不搜（除非 history 模式也只搜 archived，不搜 archive zone）
    e.zone != 'archive'
    -- 相似度門檻（冷區提高）
    AND (1 - (e.embedding <=> query_embedding)) > CASE
      WHEN e.zone = 'cold' THEN GREATEST(match_threshold, 0.40)
      ELSE match_threshold
    END
    -- 三種模式的 filter
    AND CASE search_mode
      WHEN 'task' THEN
        -- task 模式：只搜 active，排除 log 類和 reports 分類
        e.status = 'active'
        AND e.content_type != 'log'
        AND e.category NOT IN ('reports')
        AND (e.expires_at IS NULL OR e.expires_at > CURRENT_DATE)
      WHEN 'code' THEN
        -- code 模式：只搜技術文件 category
        e.status = 'active'
        AND e.category IN ('cookbook', 'docs', 'knowledge', 'extensions', 'codebase')
      WHEN 'history' THEN
        -- history 模式：active + archived，搜診斷和記憶
        e.status IN ('active', 'archived')
        AND e.category IN ('reports', 'memory', 'learning', 'knowledge')
      ELSE
        -- 未知模式回退到 task 模式
        e.status = 'active'
        AND (e.expires_at IS NULL OR e.expires_at > CURRENT_DATE)
    END
  ORDER BY
    e.is_pinned DESC,            -- pinned 永遠排第一
    (e.embedding <=> query_embedding) ASC  -- 向量距離小 = 相似度高
  LIMIT match_count;
$$;
