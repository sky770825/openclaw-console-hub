-- 因果真相 Smart Cultivation Assistant v1
-- 依賴：causelaw_members / karma_ledger / (可選) recalculate_karma_profile(uuid)
-- 執行方式：Supabase SQL Editor 全段執行

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- Role helpers (強化：改讀 causelaw_members.role)
-- =========================================================

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select m.role from public.causelaw_members m where m.id = auth.uid() limit 1),
    'member'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role() in ('admin', 'superadmin');
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role() in ('moderator', 'admin', 'superadmin');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Assistant tables
-- =========================================================

create table if not exists public.assistant_daily_checkin (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  checkin_date date not null,
  mood_level int not null check (mood_level between 0 and 4),
  conflict_level int not null check (conflict_level between 0 and 4),
  temptation_level int not null check (temptation_level between 0 and 4),
  risk_score int not null default 0 check (risk_score between 0 and 100),
  risk_band text not null default 'low' check (risk_band in ('low', 'medium', 'high')),
  primary_risk_code text not null default 'speech_harm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, checkin_date)
);

create index if not exists idx_assistant_checkin_member_date
  on public.assistant_daily_checkin(member_id, checkin_date desc);

drop trigger if exists trg_assistant_daily_checkin_updated_at on public.assistant_daily_checkin;
create trigger trg_assistant_daily_checkin_updated_at
before update on public.assistant_daily_checkin
for each row execute function public.set_updated_at();

create table if not exists public.assistant_recommendations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  checkin_id uuid not null references public.assistant_daily_checkin(id) on delete cascade,
  recommendation_code text not null,
  title text not null,
  detail text not null,
  why_text text not null,
  expected_delta int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_recommendations_member_created
  on public.assistant_recommendations(member_id, created_at desc);
create index if not exists idx_assistant_recommendations_checkin
  on public.assistant_recommendations(checkin_id);

create table if not exists public.assistant_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  task_date date not null,
  task_type text not null check (task_type in ('chanting', 'speech_discipline', 'good_deed', 'repentance')),
  task_title text not null,
  target_count int not null check (target_count > 0),
  completed_count int not null default 0 check (completed_count >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  evidence_note text,
  points_reward int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_tasks_member_date
  on public.assistant_tasks(member_id, task_date desc);
create index if not exists idx_assistant_tasks_member_status
  on public.assistant_tasks(member_id, status);

drop trigger if exists trg_assistant_tasks_updated_at on public.assistant_tasks;
create trigger trg_assistant_tasks_updated_at
before update on public.assistant_tasks
for each row execute function public.set_updated_at();

create table if not exists public.assistant_reminders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  remind_time timestamptz not null,
  channel text not null default 'in_app' check (channel in ('in_app')),
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'read')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_reminders_member_status_time
  on public.assistant_reminders(member_id, status, remind_time);

drop trigger if exists trg_assistant_reminders_updated_at on public.assistant_reminders;
create trigger trg_assistant_reminders_updated_at
before update on public.assistant_reminders
for each row execute function public.set_updated_at();

-- =========================================================
-- Auto-scoring for daily checkin
-- =========================================================

create or replace function public.assistant_compute_risk_fields()
returns trigger
language plpgsql
as $$
declare
  v_raw numeric;
begin
  -- 3 題總分 0~12，換算為 0~100
  v_raw := ((new.mood_level + new.conflict_level + new.temptation_level)::numeric / 12.0) * 100.0;
  new.risk_score := greatest(0, least(100, round(v_raw)));

  if new.risk_score >= 67 then
    new.risk_band := 'high';
  elsif new.risk_score >= 34 then
    new.risk_band := 'medium';
  else
    new.risk_band := 'low';
  end if;

  -- 主要風險類型（優先順序：衝突 > 情緒 > 誘惑）
  if new.conflict_level >= new.mood_level and new.conflict_level >= new.temptation_level then
    new.primary_risk_code := 'speech_harm';
  elsif new.mood_level >= new.temptation_level then
    new.primary_risk_code := 'anger_harm';
  else
    new.primary_risk_code := 'greed_harm';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assistant_compute_risk_fields on public.assistant_daily_checkin;
create trigger trg_assistant_compute_risk_fields
before insert or update on public.assistant_daily_checkin
for each row execute function public.assistant_compute_risk_fields();

-- =========================================================
-- Task completion -> karma_ledger integration
-- =========================================================

create or replace function public.assistant_sync_task_to_karma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text;
  v_points int;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status <> 'completed' and new.status = 'completed' then
    v_idempotency_key := 'assistant_task_completed:' || new.id::text;
    v_points := case
      when new.points_reward <> 0 then new.points_reward
      when new.task_type = 'repentance' then 8
      when new.task_type = 'chanting' then 6
      when new.task_type = 'speech_discipline' then 6
      when new.task_type = 'good_deed' then 10
      else 5
    end;

    insert into public.karma_ledger (
      member_id,
      event_type,
      category_code,
      points,
      karma_debt_delta,
      source,
      evidence,
      rule_version,
      idempotency_key
    )
    values (
      new.member_id,
      case when new.task_type = 'repentance' then 'repentance' else 'merit' end,
      'assistant_task_' || new.task_type,
      v_points,
      0,
      'system',
      jsonb_build_object('assistant_task_id', new.id, 'task_title', new.task_title, 'task_date', new.task_date),
      'assistant-v1',
      v_idempotency_key
    )
    on conflict (idempotency_key) do nothing;

    -- 若專案已有重算函式，則自動重算
    if to_regprocedure('public.recalculate_karma_profile(uuid)') is not null then
      perform public.recalculate_karma_profile(new.member_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assistant_sync_task_to_karma on public.assistant_tasks;
create trigger trg_assistant_sync_task_to_karma
after update on public.assistant_tasks
for each row execute function public.assistant_sync_task_to_karma();

-- =========================================================
-- RLS
-- =========================================================

alter table public.assistant_daily_checkin enable row level security;
alter table public.assistant_recommendations enable row level security;
alter table public.assistant_tasks enable row level security;
alter table public.assistant_reminders enable row level security;

drop policy if exists assistant_checkin_select_self_or_admin on public.assistant_daily_checkin;
create policy assistant_checkin_select_self_or_admin on public.assistant_daily_checkin
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_checkin_insert_self_or_admin on public.assistant_daily_checkin;
create policy assistant_checkin_insert_self_or_admin on public.assistant_daily_checkin
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_checkin_update_self_or_admin on public.assistant_daily_checkin;
create policy assistant_checkin_update_self_or_admin on public.assistant_daily_checkin
for update using (member_id = auth.uid() or public.is_moderator_or_admin())
with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_recommendations_select_self_or_admin on public.assistant_recommendations;
create policy assistant_recommendations_select_self_or_admin on public.assistant_recommendations
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_recommendations_insert_admin_or_system on public.assistant_recommendations;
create policy assistant_recommendations_insert_admin_or_system on public.assistant_recommendations
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_tasks_select_self_or_admin on public.assistant_tasks;
create policy assistant_tasks_select_self_or_admin on public.assistant_tasks
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_tasks_insert_self_or_admin on public.assistant_tasks;
create policy assistant_tasks_insert_self_or_admin on public.assistant_tasks
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_tasks_update_self_or_admin on public.assistant_tasks;
create policy assistant_tasks_update_self_or_admin on public.assistant_tasks
for update using (member_id = auth.uid() or public.is_moderator_or_admin())
with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_reminders_select_self_or_admin on public.assistant_reminders;
create policy assistant_reminders_select_self_or_admin on public.assistant_reminders
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_reminders_insert_self_or_admin on public.assistant_reminders;
create policy assistant_reminders_insert_self_or_admin on public.assistant_reminders
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists assistant_reminders_update_self_or_admin on public.assistant_reminders;
create policy assistant_reminders_update_self_or_admin on public.assistant_reminders
for update using (member_id = auth.uid() or public.is_moderator_or_admin())
with check (member_id = auth.uid() or public.is_moderator_or_admin());

commit;
