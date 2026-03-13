-- Supabase 資料表建立 SQL
-- 達爾發想審核系統 (dar_ideas)

-- 1. 建立資料表
CREATE TABLE IF NOT EXISTS dar_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  title TEXT NOT NULL,
  summary TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 啟用 RLS
ALTER TABLE dar_ideas ENABLE ROW LEVEL SECURITY;

-- 3. 建立存取策略（允許所有操作，生產環境應該更嚴格）
CREATE POLICY "Allow all operations" ON dar_ideas
  FOR ALL USING (true) WITH CHECK (true);

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_dar_ideas_status ON dar_ideas(status);
CREATE INDEX IF NOT EXISTS idx_dar_ideas_created_at ON dar_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dar_ideas_number ON dar_ideas(number);

-- 5. 插入預設資料
INSERT INTO dar_ideas (id, title, summary, file_path, status, tags)
VALUES (
  'idea-001',
  'Token 消耗優化策略',
  '發現 5 個高 Token 情境：連續錯誤重試、重複搜尋、大段代碼複製等，提出搜尋快取、指數退避、Context 壓縮等解決方案。',
  'docs/dar-ideas/pending/idea-001-token-optimization.md',
  'pending',
  ARRAY['optimization', 'token', 'performance']
)
ON CONFLICT (id) DO NOTHING;

-- 驗證資料
SELECT * FROM dar_ideas;
