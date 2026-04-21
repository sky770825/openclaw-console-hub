-- ============================================================
-- task_checkpoints — 7 步 Sprint 流程輕量 checkpoint 機制
-- ============================================================
-- 借用 LangGraph 的 checkpoint 概念（不引入 runtime 依賴）
-- 每一步 (analyze/plan/code/test/review/deploy/verify) 執行後
-- 儲存當下 state，支援：
--   1. replay  — 從某步重跑
--   2. fork    — time-travel 分支
--   3. history — 完整追溯鏈
--
-- 請在 Supabase SQL Editor 手動執行此腳本
-- ============================================================

CREATE TABLE IF NOT EXISTS task_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES openclaw_tasks(id) ON DELETE CASCADE,
  step TEXT NOT NULL,                      -- 'analyze' | 'plan' | 'code' | 'test' | 'review' | 'deploy' | 'verify'
  step_index INT NOT NULL,                 -- 0~6 對應 7 步
  state_json JSONB NOT NULL,               -- 該步輸出 (input/output/errors/artifacts...)
  parent_checkpoint_id UUID REFERENCES task_checkpoints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 加速「抓某 task 的最新 checkpoint」
CREATE INDEX IF NOT EXISTS idx_task_checkpoints_task_id
  ON task_checkpoints(task_id, step_index DESC);

-- 加速「依時間回放」
CREATE INDEX IF NOT EXISTS idx_task_checkpoints_created_at
  ON task_checkpoints(task_id, created_at DESC);

-- 加速 fork 鏈追溯
CREATE INDEX IF NOT EXISTS idx_task_checkpoints_parent
  ON task_checkpoints(parent_checkpoint_id);

COMMENT ON TABLE task_checkpoints IS 'Sprint 7 步流程 checkpoint — 借用 LangGraph 概念，支援 replay / fork / history';
COMMENT ON COLUMN task_checkpoints.step IS '7 步之一：analyze/plan/code/test/review/deploy/verify';
COMMENT ON COLUMN task_checkpoints.step_index IS '步驟索引 0-6，配合 step 使用';
COMMENT ON COLUMN task_checkpoints.state_json IS '該步的完整輸出狀態，replay 時回傳給呼叫者';
COMMENT ON COLUMN task_checkpoints.parent_checkpoint_id IS 'fork 來源：NULL=主幹，非 NULL=time-travel 分支';
