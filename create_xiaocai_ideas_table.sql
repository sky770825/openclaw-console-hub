-- 建立小蔡發想審核表格
CREATE TABLE IF NOT EXISTS xiaocai_ideas (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_xiaocai_ideas_status ON xiaocai_ideas(status);
CREATE INDEX IF NOT EXISTS idx_xiaocai_ideas_created_at ON xiaocai_ideas(created_at DESC);

-- 啟用 Row Level Security (如果需要)
ALTER TABLE xiaocai_ideas ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀寫（開發環境）
CREATE POLICY "Allow anonymous read" ON xiaocai_ideas
  FOR SELECT USING (true);
  
CREATE POLICY "Allow anonymous write" ON xiaocai_ideas
  FOR ALL USING (true) WITH CHECK (true);

-- 建立觸發器函數：自動更新 number
CREATE OR REPLACE FUNCTION set_idea_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = 0 THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number FROM xiaocai_ideas;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_set_idea_number ON xiaocai_ideas;
CREATE TRIGGER trigger_set_idea_number
  BEFORE INSERT ON xiaocai_ideas
  FOR EACH ROW
  EXECUTE FUNCTION set_idea_number();
