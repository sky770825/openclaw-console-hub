#!/bin/bash
set -e
# 設定堤諾米斯達爾（達爾）發想審核中心 - Supabase 表格建立腳本

echo "🔧 堤諾米斯達爾（達爾）發想審核中心 - 資料庫設定"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "請在 Supabase SQL Editor 執行以下 SQL:"
echo ""
cat << 'EOF'
-- =====================================
-- 堤諾米斯達爾（達爾）發想審核中心 (XiaoCai Ideas)
-- =====================================

-- 建立表格
CREATE TABLE IF NOT EXISTS xiaocai_ideas (
  id TEXT PRIMARY KEY,
  number SERIAL NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_xiaocai_ideas_number ON xiaocai_ideas(number);

-- 啟用 Row Level Security
ALTER TABLE xiaocai_ideas ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀寫（開發環境）
DROP POLICY IF EXISTS "Allow anonymous read" ON xiaocai_ideas;
DROP POLICY IF EXISTS "Allow anonymous write" ON xiaocai_ideas;

CREATE POLICY "Allow anonymous read" ON xiaocai_ideas
  FOR SELECT USING (true);
  
CREATE POLICY "Allow anonymous write" ON xiaocai_ideas
  FOR ALL USING (true) WITH CHECK (true);

-- 插入預設資料
INSERT INTO xiaocai_ideas (id, title, summary, file_path, status, tags) VALUES
('idea-002', '自動化 Token 監控', '建立每日 Token 使用量監控，超過閾值時自動通知。', 'docs/xiaocai-ideas/pending/idea-002-token-monitor.md', 'approved', ARRAY['automation', 'monitoring', 'token'])
ON CONFLICT (id) DO NOTHING;

EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 使用方式:"
echo ""
echo "1. 登入 Supabase Dashboard"
echo "2. 開啟 SQL Editor"
echo "3. 貼上以上 SQL 並執行"
echo "4. 重新啟動任務板後端"
echo ""
echo "✅ 設定完成後，使用以下指令:"
echo "  ./scripts/add-xiaocai-idea.sh     # 新增單一發想"
echo "  ./scripts/batch-add-xiaocai-ideas.sh  # 批次新增14個發想"
echo "  ./scripts/approve-idea.sh <id>    # 審核通過並建立任務"
echo ""
