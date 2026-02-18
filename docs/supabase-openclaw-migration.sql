-- OpenClaw 資料表遷移
-- 在新 Supabase 專案 (vbejswywswaeyfasnwjq) 的 SQL Editor 中執行此腳本
-- 參考：docs/SUPABASE-SETUP.md

-- 必要 extension（uuid 生成）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. openclaw_tasks
CREATE TABLE IF NOT EXISTS public.openclaw_tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  cat text DEFAULT 'feature' CHECK (cat IN ('bugfix','learn','feature','improve')),
  status text DEFAULT 'queued' CHECK (status IN ('queued','in_progress','done')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  auto boolean DEFAULT false,
  from_review_id text,
  subs jsonb DEFAULT '[]'::jsonb,
  thought text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_tasks ENABLE ROW LEVEL SECURITY;
-- 僅 service_role（後端）可存取，anon 無政策故無法存取

-- 2. openclaw_reviews
CREATE TABLE IF NOT EXISTS public.openclaw_reviews (
  id text PRIMARY KEY,
  title text NOT NULL,
  type text DEFAULT 'tool' CHECK (type IN ('tool','skill','issue','learn')),
  description text,
  src text,
  pri text DEFAULT 'medium' CHECK (pri IN ('critical','high','medium')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reasoning text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_reviews ENABLE ROW LEVEL SECURITY;

-- 3. openclaw_automations
CREATE TABLE IF NOT EXISTS public.openclaw_automations (
  id text PRIMARY KEY,
  name text NOT NULL,
  cron text NOT NULL,
  active boolean DEFAULT true,
  chain jsonb DEFAULT '[]'::jsonb,
  health integer DEFAULT 100,
  runs integer DEFAULT 0,
  last_run text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_automations ENABLE ROW LEVEL SECURITY;

-- 4. openclaw_evolution_log
CREATE TABLE IF NOT EXISTS public.openclaw_evolution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  t text,
  x text NOT NULL,
  c text,
  tag text,
  tc text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_evolution_log ENABLE ROW LEVEL SECURITY;

-- 5. openclaw_plugins
CREATE TABLE IF NOT EXISTS public.openclaw_plugins (
  id text PRIMARY KEY,
  name text NOT NULL,
  status text DEFAULT 'inactive' CHECK (status IN ('active','inactive','template')),
  description text,
  icon text,
  calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_plugins ENABLE ROW LEVEL SECURITY;

-- 6. openclaw_audit_logs
CREATE TABLE IF NOT EXISTS public.openclaw_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  resource text,
  resource_id text,
  user_id uuid,
  ip text,
  diff jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. openclaw_ui_actions
CREATE TABLE IF NOT EXISTS public.openclaw_ui_actions (
  id text PRIMARY KEY,
  action_code text NOT NULL UNIQUE,
  selector text NOT NULL,
  label text,
  category text,
  api_path text,
  n8n_webhook_url text,
  created_at timestamptz DEFAULT now()
);
-- ui_actions 供後端 service_role 讀取
ALTER TABLE public.openclaw_ui_actions ENABLE ROW LEVEL SECURITY;

-- updated_at 自動維護
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_openclaw_tasks_updated_at ON public.openclaw_tasks;
CREATE TRIGGER trg_openclaw_tasks_updated_at
BEFORE UPDATE ON public.openclaw_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_openclaw_reviews_updated_at ON public.openclaw_reviews;
CREATE TRIGGER trg_openclaw_reviews_updated_at
BEFORE UPDATE ON public.openclaw_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_openclaw_automations_updated_at ON public.openclaw_automations;
CREATE TRIGGER trg_openclaw_automations_updated_at
BEFORE UPDATE ON public.openclaw_automations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_openclaw_plugins_updated_at ON public.openclaw_plugins;
CREATE TRIGGER trg_openclaw_plugins_updated_at
BEFORE UPDATE ON public.openclaw_plugins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_openclaw_tasks_status ON public.openclaw_tasks (status);
CREATE INDEX IF NOT EXISTS idx_openclaw_tasks_updated_at ON public.openclaw_tasks (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_reviews_status ON public.openclaw_reviews (status);
CREATE INDEX IF NOT EXISTS idx_openclaw_reviews_updated_at ON public.openclaw_reviews (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_automations_active ON public.openclaw_automations (active);
CREATE INDEX IF NOT EXISTS idx_openclaw_automations_updated_at ON public.openclaw_automations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_evolution_log_created_at ON public.openclaw_evolution_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_audit_logs_created_at ON public.openclaw_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_audit_logs_action ON public.openclaw_audit_logs (action);

-- 9. openclaw_sessions（Agent 協作 SharedState）
CREATE TABLE IF NOT EXISTS public.openclaw_sessions (
  id text PRIMARY KEY,
  shared_state jsonb NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','completed','failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_sessions ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_openclaw_sessions_updated_at ON public.openclaw_sessions;
CREATE TRIGGER trg_openclaw_sessions_updated_at
BEFORE UPDATE ON public.openclaw_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_openclaw_sessions_status ON public.openclaw_sessions (status);
CREATE INDEX IF NOT EXISTS idx_openclaw_sessions_updated_at ON public.openclaw_sessions (updated_at DESC);

-- 10. openclaw_commands（Command API 審計與回放）
CREATE TABLE IF NOT EXISTS public.openclaw_commands (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  session_id text REFERENCES public.openclaw_sessions(id) ON DELETE CASCADE,
  from_agent text NOT NULL,
  command jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_commands ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_openclaw_commands_session_id ON public.openclaw_commands (session_id);
CREATE INDEX IF NOT EXISTS idx_openclaw_commands_created_at ON public.openclaw_commands (created_at DESC);

-- 11. openclaw_interrupts（Human-in-the-loop 中斷/恢復）
CREATE TABLE IF NOT EXISTS public.openclaw_interrupts (
  id text PRIMARY KEY,
  session_id text REFERENCES public.openclaw_sessions(id) ON DELETE CASCADE,
  from_agent text NOT NULL,
  reason text NOT NULL,
  decision text CHECK (decision IN ('approve','reject','modify')),
  decided_by text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.openclaw_interrupts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_openclaw_interrupts_session_id ON public.openclaw_interrupts (session_id);
CREATE INDEX IF NOT EXISTS idx_openclaw_interrupts_created_at ON public.openclaw_interrupts (created_at DESC);

-- 12. openclaw_runs（完整執行紀錄：每次 run 一筆）
CREATE TABLE IF NOT EXISTS public.openclaw_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  task_name text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_ms integer,
  input_summary text,
  output_summary text,
  steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_openclaw_runs_task_id ON public.openclaw_runs (task_id);
CREATE INDEX IF NOT EXISTS idx_openclaw_runs_started_at ON public.openclaw_runs (started_at DESC);

-- =====================================================
-- Projects 專案製作（2026-02-11 新增）
-- =====================================================

-- 專案階段表
CREATE TABLE IF NOT EXISTS public.openclaw_project_phases (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.openclaw_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  done boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_project_phases ENABLE ROW LEVEL SECURITY;

-- 專案主表
CREATE TABLE IF NOT EXISTS public.openclaw_projects (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'planning' CHECK (status IN ('planning','in_progress','done','paused')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_projects ENABLE ROW LEVEL SECURITY;

-- 更新時間觸發器
DROP TRIGGER IF EXISTS trg_openclaw_projects_updated_at ON public.openclaw_projects;
CREATE TRIGGER trg_openclaw_projects_updated_at
BEFORE UPDATE ON public.openclaw_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_openclaw_project_phases_updated_at ON public.openclaw_project_phases;
CREATE TRIGGER trg_openclaw_project_phases_updated_at
BEFORE UPDATE ON public.openclaw_project_phases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_openclaw_projects_status ON public.openclaw_projects (status);
CREATE INDEX IF NOT EXISTS idx_openclaw_projects_updated_at ON public.openclaw_projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_project_phases_project_id ON public.openclaw_project_phases (project_id);

-- =====================================================
-- 13. openclaw_memory（AI 記憶系統 — 2026-02-18 新增）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.openclaw_memory (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('decision','task_result','report','insight','external','note')),
  source text NOT NULL,
  title text NOT NULL,
  content text,
  tags text[] DEFAULT '{}',
  meta jsonb DEFAULT '{}'::jsonb,
  importance integer DEFAULT 5 CHECK (importance >= 0 AND importance <= 10),
  related_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.openclaw_memory ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_openclaw_memory_ts ON public.openclaw_memory (ts DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_memory_type ON public.openclaw_memory (type);
CREATE INDEX IF NOT EXISTS idx_openclaw_memory_source ON public.openclaw_memory (source);
CREATE INDEX IF NOT EXISTS idx_openclaw_memory_importance ON public.openclaw_memory (importance DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_memory_tags ON public.openclaw_memory USING GIN (tags);
