-- firewall_logs 資料表結構
-- P1 任務：防火牆 — postMessage 白名單過濾中介層
-- 用途：記錄被攔截的未授權 postMessage 事件

CREATE TABLE IF NOT EXISTS firewall_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  origin TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'blocked' CHECK (status IN ('blocked', 'allowed', 'investigating', 'resolved')),
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引優化查詢
CREATE INDEX IF NOT EXISTS idx_firewall_logs_event_type ON firewall_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_origin ON firewall_logs(origin);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_blocked_at ON firewall_logs(blocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_severity ON firewall_logs(severity);

-- 啟用 RLS（Row Level Security）
ALTER TABLE firewall_logs ENABLE ROW LEVEL SECURITY;

-- 允許服務角色讀寫
CREATE POLICY "Service role can manage firewall_logs"
  ON firewall_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 允許已認證使用者讀取（用於儀表板顯示）
CREATE POLICY "Authenticated users can read firewall_logs"
  ON firewall_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- 註解
COMMENT ON TABLE firewall_logs IS '記錄被 postMessage 防火牆攔截的未授權事件';
COMMENT ON COLUMN firewall_logs.event_type IS '被攔截的事件類型';
COMMENT ON COLUMN firewall_logs.origin IS '事件來源（origin 或 client ID）';
COMMENT ON COLUMN firewall_logs.details IS '詳細資訊（JSON 格式）';
COMMENT ON COLUMN firewall_logs.severity IS '嚴重等級：low/medium/high/critical';
COMMENT ON COLUMN firewall_logs.status IS '處理狀態：blocked/allowed/investigating/resolved';
