-- OpenClaw 資料表遷移
-- 在新 Supabase 專案 (vbejswywswaeyfasnwjq) 的 SQL Editor 中執行此腳本
-- 參考：docs/SUPABASE-SETUP.md

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
