-- 因果真相 Membership v1
-- 執行方式：Supabase SQL Editor 全段執行

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- Utilities
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') in ('admin', 'superadmin');
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') in ('moderator', 'admin', 'superadmin');
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
-- Members
-- =========================================================

create table if not exists public.causelaw_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '匿名',
  role text not null default 'member' check (role in ('member', 'moderator', 'admin', 'superadmin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_causelaw_members_updated_at on public.causelaw_members;
create trigger trg_causelaw_members_updated_at
before update on public.causelaw_members
for each row execute function public.set_updated_at();

create index if not exists idx_causelaw_members_role on public.causelaw_members(role);
create index if not exists idx_causelaw_members_status on public.causelaw_members(status);

-- =========================================================
-- Content tables (existing-safe)
-- =========================================================

create table if not exists public.causelaw_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.causelaw_members(id) on delete set null,
  display_name text,
  title text not null,
  content text not null,
  category text not null default '其他',
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'appealed')),
  moderation_reason text,
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.causelaw_posts add column if not exists moderation_reason text;
alter table public.causelaw_posts add column if not exists user_id uuid references public.causelaw_members(id) on delete set null;
alter table public.causelaw_posts alter column status set default 'pending';

drop trigger if exists trg_causelaw_posts_updated_at on public.causelaw_posts;
create trigger trg_causelaw_posts_updated_at
before update on public.causelaw_posts
for each row execute function public.set_updated_at();

create index if not exists idx_posts_status_created on public.causelaw_posts(status, created_at desc);
create index if not exists idx_posts_user_id on public.causelaw_posts(user_id);
create index if not exists idx_posts_category on public.causelaw_posts(category);

create table if not exists public.causelaw_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.causelaw_posts(id) on delete cascade,
  user_id uuid references public.causelaw_members(id) on delete set null,
  display_name text,
  content text not null,
  parent_id uuid references public.causelaw_comments(id) on delete cascade,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.causelaw_comments add column if not exists user_id uuid references public.causelaw_members(id) on delete set null;

drop trigger if exists trg_causelaw_comments_updated_at on public.causelaw_comments;
create trigger trg_causelaw_comments_updated_at
before update on public.causelaw_comments
for each row execute function public.set_updated_at();

create index if not exists idx_comments_post_created on public.causelaw_comments(post_id, created_at asc);
create index if not exists idx_comments_parent on public.causelaw_comments(parent_id);
create index if not exists idx_comments_user_id on public.causelaw_comments(user_id);

-- =========================================================
-- Karma tables
-- =========================================================

create table if not exists public.karma_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  event_type text not null check (event_type in ('merit', 'demerit', 'repentance', 'penalty', 'adjustment')),
  category_code text not null,
  points int not null default 0,
  karma_debt_delta int not null default 0,
  source text not null default 'system' check (source in ('user', 'admin', 'system')),
  evidence jsonb not null default '{}'::jsonb,
  rule_version text not null default 'v1',
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_karma_ledger_member_created on public.karma_ledger(member_id, created_at desc);
create index if not exists idx_karma_ledger_event_type on public.karma_ledger(event_type);

create table if not exists public.karma_profile (
  member_id uuid primary key references public.causelaw_members(id) on delete cascade,
  merit_points int not null default 0,
  demerit_points int not null default 0,
  karma_debt int not null default 0,
  repentance_credit int not null default 0,
  net_score int not null default 0,
  realm_code text not null default 'human',
  hell_level int,
  updated_at timestamptz not null default now()
);

create table if not exists public.karma_daily_snapshot (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  snapshot_date date not null,
  net_score int not null,
  realm_code text not null,
  hell_level int,
  rule_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique(member_id, snapshot_date)
);

create index if not exists idx_karma_snapshot_member_date on public.karma_daily_snapshot(member_id, snapshot_date desc);

create table if not exists public.repentance_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  template_code text not null,
  required_days int not null check (required_days > 0),
  current_streak int not null default 0 check (current_streak >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_repentance_tasks_updated_at on public.repentance_tasks;
create trigger trg_repentance_tasks_updated_at
before update on public.repentance_tasks
for each row execute function public.set_updated_at();

create index if not exists idx_repentance_tasks_member_status on public.repentance_tasks(member_id, status);

create table if not exists public.moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'member', 'rule', 'karma')),
  target_id text not null,
  action text not null,
  actor_id uuid references public.causelaw_members(id) on delete set null,
  reason text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_log_target on public.moderation_audit_log(target_type, target_id);
create index if not exists idx_moderation_log_actor on public.moderation_audit_log(actor_id, created_at desc);

-- =========================================================
-- Recalculation function
-- =========================================================

create or replace function public.recalculate_karma_profile(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merit int := 0;
  v_demerit int := 0;
  v_repentance int := 0;
  v_debt int := 0;
  v_net int := 0;
  v_realm text := 'human';
  v_hell_level int := null;
begin
  select
    coalesce(sum(case when event_type = 'merit' then greatest(points, 0) else 0 end), 0),
    coalesce(sum(case when event_type = 'demerit' then abs(least(points, 0)) else 0 end), 0),
    coalesce(sum(case when event_type = 'repentance' then greatest(points, 0) else 0 end), 0),
    coalesce(sum(karma_debt_delta), 0)
  into v_merit, v_demerit, v_repentance, v_debt
  from public.karma_ledger
  where member_id = p_member_id;

  v_net := v_merit - v_demerit - v_debt + v_repentance;

  if v_net >= 300 then
    v_realm := 'heaven_court_candidate';
  elsif v_net >= 100 then
    v_realm := 'deva';
  elsif v_net >= 40 then
    v_realm := 'asura_band';
  elsif v_net >= -39 then
    v_realm := 'human';
  elsif v_net >= -79 then
    v_realm := 'preta';
  elsif v_net >= -119 then
    v_realm := 'animal';
  else
    v_realm := 'hell';
  end if;

  if v_realm = 'hell' then
    if abs(v_net) >= 300 then v_hell_level := 18;
    elsif abs(v_net) >= 230 then v_hell_level := 15;
    elsif abs(v_net) >= 180 then v_hell_level := 10;
    elsif abs(v_net) >= 140 then v_hell_level := 6;
    else v_hell_level := 2;
    end if;
  end if;

  insert into public.karma_profile (
    member_id, merit_points, demerit_points, karma_debt, repentance_credit, net_score, realm_code, hell_level, updated_at
  )
  values (p_member_id, v_merit, v_demerit, v_debt, v_repentance, v_net, v_realm, v_hell_level, now())
  on conflict (member_id)
  do update set
    merit_points = excluded.merit_points,
    demerit_points = excluded.demerit_points,
    karma_debt = excluded.karma_debt,
    repentance_credit = excluded.repentance_credit,
    net_score = excluded.net_score,
    realm_code = excluded.realm_code,
    hell_level = excluded.hell_level,
    updated_at = now();
end;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.causelaw_members enable row level security;
alter table public.causelaw_posts enable row level security;
alter table public.causelaw_comments enable row level security;
alter table public.karma_ledger enable row level security;
alter table public.karma_profile enable row level security;
alter table public.karma_daily_snapshot enable row level security;
alter table public.repentance_tasks enable row level security;
alter table public.moderation_audit_log enable row level security;

-- Members policies
drop policy if exists members_select_self_or_admin on public.causelaw_members;
create policy members_select_self_or_admin on public.causelaw_members
for select using (auth.uid() = id or public.is_admin());

drop policy if exists members_update_self_or_admin on public.causelaw_members;
create policy members_update_self_or_admin on public.causelaw_members
for update using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists members_insert_self on public.causelaw_members;
create policy members_insert_self on public.causelaw_members
for insert with check (auth.uid() = id or public.is_admin());

-- Posts policies
drop policy if exists posts_select_approved_or_admin on public.causelaw_posts;
create policy posts_select_approved_or_admin on public.causelaw_posts
for select using (status = 'approved' or public.is_moderator_or_admin() or auth.uid() = user_id);

drop policy if exists posts_insert_any_pending on public.causelaw_posts;
create policy posts_insert_any_pending on public.causelaw_posts
for insert with check (
  status in ('pending', 'draft')
  and (user_id is null or user_id = auth.uid() or public.is_moderator_or_admin())
);

drop policy if exists posts_update_moderator_admin on public.causelaw_posts;
create policy posts_update_moderator_admin on public.causelaw_posts
for update using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

-- Comments policies
drop policy if exists comments_select_public on public.causelaw_comments;
create policy comments_select_public on public.causelaw_comments
for select using (
  exists (
    select 1 from public.causelaw_posts p
    where p.id = post_id and (p.status = 'approved' or public.is_moderator_or_admin() or p.user_id = auth.uid())
  )
);

drop policy if exists comments_insert_on_visible_posts on public.causelaw_comments;
create policy comments_insert_on_visible_posts on public.causelaw_comments
for insert with check (
  exists (
    select 1 from public.causelaw_posts p
    where p.id = post_id and p.status = 'approved'
  )
  and (user_id is null or user_id = auth.uid() or public.is_moderator_or_admin())
);

drop policy if exists comments_update_admin_only on public.causelaw_comments;
create policy comments_update_admin_only on public.causelaw_comments
for update using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

-- Karma policies
drop policy if exists karma_ledger_select_self_or_admin on public.karma_ledger;
create policy karma_ledger_select_self_or_admin on public.karma_ledger
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists karma_ledger_insert_member_or_admin on public.karma_ledger;
create policy karma_ledger_insert_member_or_admin on public.karma_ledger
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists karma_ledger_update_admin_only on public.karma_ledger;
create policy karma_ledger_update_admin_only on public.karma_ledger
for update using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

drop policy if exists karma_profile_select_self_or_admin on public.karma_profile;
create policy karma_profile_select_self_or_admin on public.karma_profile
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists karma_profile_update_admin_only on public.karma_profile;
create policy karma_profile_update_admin_only on public.karma_profile
for update using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

drop policy if exists karma_snapshot_select_self_or_admin on public.karma_daily_snapshot;
create policy karma_snapshot_select_self_or_admin on public.karma_daily_snapshot
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists repentance_select_self_or_admin on public.repentance_tasks;
create policy repentance_select_self_or_admin on public.repentance_tasks
for select using (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists repentance_insert_self_or_admin on public.repentance_tasks;
create policy repentance_insert_self_or_admin on public.repentance_tasks
for insert with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists repentance_update_self_or_admin on public.repentance_tasks;
create policy repentance_update_self_or_admin on public.repentance_tasks
for update using (member_id = auth.uid() or public.is_moderator_or_admin())
with check (member_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists moderation_log_select_admin on public.moderation_audit_log;
create policy moderation_log_select_admin on public.moderation_audit_log
for select using (public.is_moderator_or_admin());

drop policy if exists moderation_log_insert_admin on public.moderation_audit_log;
create policy moderation_log_insert_admin on public.moderation_audit_log
for insert with check (public.is_moderator_or_admin());

commit;
