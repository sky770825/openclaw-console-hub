# Claude 審查 openclaw_action_logs 資料表建立 SQL

## 原始 SQL

`sql
CREATE TABLE openclaw_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms BIGINT,
  input_payload JSONB,
  output_result JSONB,
  error_message TEXT,
  session_id TEXT
);
`

## Claude 建議改進版本

`sql
CREATE TABLE IF NOT EXISTS openclaw_action_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type   TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  duration_ms   BIGINT,
  input_payload JSONB,
  output_result JSONB,
  error_message TEXT,
  session_id    TEXT
);

-- 建議加上 Index，提升查詢效能
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at  ON openclaw_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_session_id  ON openclaw_action_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action_type ON openclaw_action_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_action_logs_status      ON openclaw_action_logs (status);
`

## 改動說明

*   *IF NOT EXISTS*: 避免重複執行時報錯。
*   *CHECK (status IN (...))*: 資料完整性約束，防止非法 status 值。
*   *created_at 欄位順序調整*: NOT NULL 放在 DEFAULT 之前，符合 PostgreSQL 慣例。
*   *加 Indexes*: 日誌表幾乎必然會按時間、session、類型查詢，提前建索引以提升查詢效能。

## 執行 DDL 的方法 (推薦給老蔡)

*   *方法 A（推薦）*: 請老蔡直接前往 Supabase Dashboard → SQL Editor，貼入上方建議 SQL 並執行即可。

## 小蔡的下一步

一旦 openclaw_action_logs 表建立完成，小蔡將會修改 action-handlers.ts`，實作 ask_ai 的日誌記錄功能，將 Token 消耗、執行時間等資訊寫入新表。
