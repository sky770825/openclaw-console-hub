-- 因果真相 Smart Cultivation Assistant v1（獨立 schema 版）
-- 目標：助手資料與主業務資料隔離，不混在 public schema
-- 依賴：public.causelaw_members / public.karma_ledger / public.recalculate_karma_profile(uuid)

begin;

create extension if not exists pgcrypto;
create schema if not exists causelaw_assistant;

-- =========================================================
-- Helpers (schema-local)
-- =========================================================

create or replace function causelaw_assistant.current_member_role()
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

create or replace function causelaw_assistant.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
as $$
  select causelaw_assistant.current_member_role() in ('moderator', 'admin', 'superadmin');
$$;

create or replace function causelaw_assistant.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Assistant tables (isolated under causelaw_assistant)
-- =========================================================

create table if not exists causelaw_assistant.daily_checkin (
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

create index if not exists idx_ca_daily_checkin_member_date
  on causelaw_assistant.daily_checkin(member_id, checkin_date desc);

drop trigger if exists trg_ca_daily_checkin_updated_at on causelaw_assistant.daily_checkin;
create trigger trg_ca_daily_checkin_updated_at
before update on causelaw_assistant.daily_checkin
for each row execute function causelaw_assistant.set_updated_at();

create table if not exists causelaw_assistant.recommendations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  checkin_id uuid not null references causelaw_assistant.daily_checkin(id) on delete cascade,
  recommendation_code text not null,
  title text not null,
  detail text not null,
  why_text text not null,
  expected_delta int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ca_recommendations_member_created
  on causelaw_assistant.recommendations(member_id, created_at desc);

create table if not exists causelaw_assistant.tasks (
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

create index if not exists idx_ca_tasks_member_date
  on causelaw_assistant.tasks(member_id, task_date desc);

drop trigger if exists trg_ca_tasks_updated_at on causelaw_assistant.tasks;
create trigger trg_ca_tasks_updated_at
before update on causelaw_assistant.tasks
for each row execute function causelaw_assistant.set_updated_at();

create table if not exists causelaw_assistant.reminders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  remind_time timestamptz not null,
  channel text not null default 'in_app' check (channel in ('in_app')),
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'read')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ca_reminders_member_status_time
  on causelaw_assistant.reminders(member_id, status, remind_time);

drop trigger if exists trg_ca_reminders_updated_at on causelaw_assistant.reminders;
create trigger trg_ca_reminders_updated_at
before update on causelaw_assistant.reminders
for each row execute function causelaw_assistant.set_updated_at();

-- =========================================================
-- Auto compute risk
-- =========================================================

create or replace function causelaw_assistant.compute_risk_fields()
returns trigger
language plpgsql
as $$
declare
  v_raw numeric;
begin
  v_raw := ((new.mood_level + new.conflict_level + new.temptation_level)::numeric / 12.0) * 100.0;
  new.risk_score := greatest(0, least(100, round(v_raw)));

  if new.risk_score >= 67 then
    new.risk_band := 'high';
  elsif new.risk_score >= 34 then
    new.risk_band := 'medium';
  else
    new.risk_band := 'low';
  end if;

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

drop trigger if exists trg_ca_compute_risk_fields on causelaw_assistant.daily_checkin;
create trigger trg_ca_compute_risk_fields
before insert or update on causelaw_assistant.daily_checkin
for each row execute function causelaw_assistant.compute_risk_fields();

-- =========================================================
-- Task completion -> public.karma_ledger
-- =========================================================

create or replace function causelaw_assistant.sync_task_to_karma()
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
      member_id, event_type, category_code, points, karma_debt_delta, source, evidence, rule_version, idempotency_key
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

    if to_regprocedure('public.recalculate_karma_profile(uuid)') is not null then
      perform public.recalculate_karma_profile(new.member_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ca_sync_task_to_karma on causelaw_assistant.tasks;
create trigger trg_ca_sync_task_to_karma
after update on causelaw_assistant.tasks
for each row execute function causelaw_assistant.sync_task_to_karma();

-- =========================================================
-- RLS
-- =========================================================

alter table causelaw_assistant.daily_checkin enable row level security;
alter table causelaw_assistant.recommendations enable row level security;
alter table causelaw_assistant.tasks enable row level security;
alter table causelaw_assistant.reminders enable row level security;

drop policy if exists ca_daily_checkin_select on causelaw_assistant.daily_checkin;
create policy ca_daily_checkin_select on causelaw_assistant.daily_checkin
for select using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_daily_checkin_insert on causelaw_assistant.daily_checkin;
create policy ca_daily_checkin_insert on causelaw_assistant.daily_checkin
for insert with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_daily_checkin_update on causelaw_assistant.daily_checkin;
create policy ca_daily_checkin_update on causelaw_assistant.daily_checkin
for update using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_recommendations_select on causelaw_assistant.recommendations;
create policy ca_recommendations_select on causelaw_assistant.recommendations
for select using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_recommendations_insert on causelaw_assistant.recommendations;
create policy ca_recommendations_insert on causelaw_assistant.recommendations
for insert with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_tasks_select on causelaw_assistant.tasks;
create policy ca_tasks_select on causelaw_assistant.tasks
for select using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_tasks_insert on causelaw_assistant.tasks;
create policy ca_tasks_insert on causelaw_assistant.tasks
for insert with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_tasks_update on causelaw_assistant.tasks;
create policy ca_tasks_update on causelaw_assistant.tasks
for update using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_reminders_select on causelaw_assistant.reminders;
create policy ca_reminders_select on causelaw_assistant.reminders
for select using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_reminders_insert on causelaw_assistant.reminders;
create policy ca_reminders_insert on causelaw_assistant.reminders
for insert with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

drop policy if exists ca_reminders_update on causelaw_assistant.reminders;
create policy ca_reminders_update on causelaw_assistant.reminders
for update using (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin());

commit;
