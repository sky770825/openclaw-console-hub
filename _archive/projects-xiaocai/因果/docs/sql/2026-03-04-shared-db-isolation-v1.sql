-- 因果真相：共用資料庫完全隔離版（v1）
-- 日期：2026-03-04
-- 目標：所有資料表 / 函數 / RPC 全部放在 causelaw_yinguo_v1 schema，避免與其他專案撞名
-- 注意：請在 Supabase Dashboard -> API Settings -> Exposed schemas 加入 causelaw_yinguo_v1

begin;

create extension if not exists pgcrypto;
create schema if not exists causelaw_yinguo_v1;

grant usage on schema causelaw_yinguo_v1 to anon, authenticated, service_role;

-- =========================================================
-- Helper functions
-- =========================================================

create or replace function causelaw_yinguo_v1.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Core tables
-- =========================================================

create table if not exists causelaw_yinguo_v1.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '匿名',
  role text not null default 'member' check (role in ('member', 'moderator', 'admin', 'superadmin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_yinguo_members_role on causelaw_yinguo_v1.members(role);
create index if not exists idx_yinguo_members_status on causelaw_yinguo_v1.members(status);

drop trigger if exists trg_yinguo_members_updated_at on causelaw_yinguo_v1.members;
create trigger trg_yinguo_members_updated_at
before update on causelaw_yinguo_v1.members
for each row execute function causelaw_yinguo_v1.set_updated_at();

create table if not exists causelaw_yinguo_v1.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references causelaw_yinguo_v1.members(id) on delete set null,
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

create index if not exists idx_yinguo_posts_status_created on causelaw_yinguo_v1.posts(status, created_at desc);
create index if not exists idx_yinguo_posts_user_id on causelaw_yinguo_v1.posts(user_id);
create index if not exists idx_yinguo_posts_category on causelaw_yinguo_v1.posts(category);

drop trigger if exists trg_yinguo_posts_updated_at on causelaw_yinguo_v1.posts;
create trigger trg_yinguo_posts_updated_at
before update on causelaw_yinguo_v1.posts
for each row execute function causelaw_yinguo_v1.set_updated_at();

create table if not exists causelaw_yinguo_v1.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references causelaw_yinguo_v1.posts(id) on delete cascade,
  user_id uuid references causelaw_yinguo_v1.members(id) on delete set null,
  display_name text,
  content text not null,
  parent_id uuid references causelaw_yinguo_v1.comments(id) on delete cascade,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_yinguo_comments_post_created on causelaw_yinguo_v1.comments(post_id, created_at asc);
create index if not exists idx_yinguo_comments_parent on causelaw_yinguo_v1.comments(parent_id);
create index if not exists idx_yinguo_comments_user_id on causelaw_yinguo_v1.comments(user_id);

drop trigger if exists trg_yinguo_comments_updated_at on causelaw_yinguo_v1.comments;
create trigger trg_yinguo_comments_updated_at
before update on causelaw_yinguo_v1.comments
for each row execute function causelaw_yinguo_v1.set_updated_at();

create table if not exists causelaw_yinguo_v1.moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'member', 'rule', 'karma')),
  target_id text not null,
  action text not null,
  actor_id uuid references causelaw_yinguo_v1.members(id) on delete set null,
  reason text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_yinguo_modlog_target on causelaw_yinguo_v1.moderation_audit_log(target_type, target_id);
create index if not exists idx_yinguo_modlog_actor on causelaw_yinguo_v1.moderation_audit_log(actor_id, created_at desc);

create or replace function causelaw_yinguo_v1.current_member_role()
returns text
language sql
stable
security definer
set search_path = causelaw_yinguo_v1, public
as $$
  select coalesce(
    (select m.role from causelaw_yinguo_v1.members m where m.id = auth.uid() limit 1),
    'member'
  );
$$;

create or replace function causelaw_yinguo_v1.current_member_status()
returns text
language sql
stable
security definer
set search_path = causelaw_yinguo_v1, public
as $$
  select coalesce(
    (select m.status from causelaw_yinguo_v1.members m where m.id = auth.uid() limit 1),
    'active'
  );
$$;

create or replace function causelaw_yinguo_v1.current_local_date()
returns date
language sql
stable
set search_path = causelaw_yinguo_v1, public
as $$
  select timezone('Asia/Taipei', now())::date;
$$;

create or replace function causelaw_yinguo_v1.is_admin()
returns boolean
language sql
stable
security definer
set search_path = causelaw_yinguo_v1, public
as $$
  select causelaw_yinguo_v1.current_member_role() in ('admin', 'superadmin');
$$;

create or replace function causelaw_yinguo_v1.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = causelaw_yinguo_v1, public
as $$
  select causelaw_yinguo_v1.current_member_role() in ('moderator', 'admin', 'superadmin');
$$;

-- =========================================================
-- Practice tables
-- =========================================================

create table if not exists causelaw_yinguo_v1.daily_checkin (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
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

create index if not exists idx_yinguo_checkin_member_date on causelaw_yinguo_v1.daily_checkin(member_id, checkin_date desc);

drop trigger if exists trg_yinguo_daily_checkin_updated_at on causelaw_yinguo_v1.daily_checkin;
create trigger trg_yinguo_daily_checkin_updated_at
before update on causelaw_yinguo_v1.daily_checkin
for each row execute function causelaw_yinguo_v1.set_updated_at();

create or replace function causelaw_yinguo_v1.compute_risk_fields()
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

drop trigger if exists trg_yinguo_compute_risk_fields on causelaw_yinguo_v1.daily_checkin;
create trigger trg_yinguo_compute_risk_fields
before insert or update on causelaw_yinguo_v1.daily_checkin
for each row execute function causelaw_yinguo_v1.compute_risk_fields();

create table if not exists causelaw_yinguo_v1.tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
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

create index if not exists idx_yinguo_tasks_member_date on causelaw_yinguo_v1.tasks(member_id, task_date desc);
create index if not exists idx_yinguo_tasks_member_status on causelaw_yinguo_v1.tasks(member_id, status);

drop trigger if exists trg_yinguo_tasks_updated_at on causelaw_yinguo_v1.tasks;
create trigger trg_yinguo_tasks_updated_at
before update on causelaw_yinguo_v1.tasks
for each row execute function causelaw_yinguo_v1.set_updated_at();

create table if not exists causelaw_yinguo_v1.wall_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
  entry_type text not null check (entry_type in ('bless', 'confess')),
  target text,
  author_name text,
  text_content text not null check (length(trim(text_content)) > 0),
  is_anonymous boolean not null default true,
  source text not null default 'web' check (source in ('web', 'api', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_yinguo_wall_member_created on causelaw_yinguo_v1.wall_entries(member_id, created_at desc);
create index if not exists idx_yinguo_wall_type_created on causelaw_yinguo_v1.wall_entries(entry_type, created_at desc);

create table if not exists causelaw_yinguo_v1.comment_likes (
  comment_id uuid not null references causelaw_yinguo_v1.comments(id) on delete cascade,
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

create index if not exists idx_yinguo_comment_likes_member_created on causelaw_yinguo_v1.comment_likes(member_id, created_at desc);

-- =========================================================
-- RLS policies
-- =========================================================

alter table causelaw_yinguo_v1.members enable row level security;
alter table causelaw_yinguo_v1.posts enable row level security;
alter table causelaw_yinguo_v1.comments enable row level security;
alter table causelaw_yinguo_v1.moderation_audit_log enable row level security;
alter table causelaw_yinguo_v1.daily_checkin enable row level security;
alter table causelaw_yinguo_v1.tasks enable row level security;
alter table causelaw_yinguo_v1.wall_entries enable row level security;
alter table causelaw_yinguo_v1.comment_likes enable row level security;

-- members

drop policy if exists yinguo_members_select on causelaw_yinguo_v1.members;
create policy yinguo_members_select on causelaw_yinguo_v1.members
for select using (auth.uid() = id or causelaw_yinguo_v1.is_admin());

drop policy if exists yinguo_members_insert on causelaw_yinguo_v1.members;
create policy yinguo_members_insert on causelaw_yinguo_v1.members
for insert with check (
  causelaw_yinguo_v1.is_admin()
  or (
    auth.uid() = id
    and role = 'member'
    and status = 'active'
  )
);

drop policy if exists yinguo_members_update on causelaw_yinguo_v1.members;
create policy yinguo_members_update on causelaw_yinguo_v1.members
for update using (auth.uid() = id or causelaw_yinguo_v1.is_admin())
with check (
  causelaw_yinguo_v1.is_admin()
  or (
    auth.uid() = id
    and role = causelaw_yinguo_v1.current_member_role()
    and status = causelaw_yinguo_v1.current_member_status()
  )
);

-- posts

drop policy if exists yinguo_posts_select on causelaw_yinguo_v1.posts;
create policy yinguo_posts_select on causelaw_yinguo_v1.posts
for select using (
  status = 'approved'
  or causelaw_yinguo_v1.is_moderator_or_admin()
  or auth.uid() = user_id
);

drop policy if exists yinguo_posts_insert on causelaw_yinguo_v1.posts;
create policy yinguo_posts_insert on causelaw_yinguo_v1.posts
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_posts_update on causelaw_yinguo_v1.posts;
create policy yinguo_posts_update on causelaw_yinguo_v1.posts
for update using (causelaw_yinguo_v1.is_moderator_or_admin())
with check (causelaw_yinguo_v1.is_moderator_or_admin());

-- comments

drop policy if exists yinguo_comments_select on causelaw_yinguo_v1.comments;
create policy yinguo_comments_select on causelaw_yinguo_v1.comments
for select using (
  exists (
    select 1
    from causelaw_yinguo_v1.posts p
    where p.id = post_id
      and (
        p.status = 'approved'
        or causelaw_yinguo_v1.is_moderator_or_admin()
        or p.user_id = auth.uid()
      )
  )
);

drop policy if exists yinguo_comments_insert on causelaw_yinguo_v1.comments;
create policy yinguo_comments_insert on causelaw_yinguo_v1.comments
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_comments_update on causelaw_yinguo_v1.comments;
create policy yinguo_comments_update on causelaw_yinguo_v1.comments
for update using (causelaw_yinguo_v1.is_moderator_or_admin())
with check (causelaw_yinguo_v1.is_moderator_or_admin());

-- moderation log

drop policy if exists yinguo_modlog_select on causelaw_yinguo_v1.moderation_audit_log;
create policy yinguo_modlog_select on causelaw_yinguo_v1.moderation_audit_log
for select using (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_modlog_insert on causelaw_yinguo_v1.moderation_audit_log;
create policy yinguo_modlog_insert on causelaw_yinguo_v1.moderation_audit_log
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

-- daily_checkin

drop policy if exists yinguo_daily_checkin_select on causelaw_yinguo_v1.daily_checkin;
create policy yinguo_daily_checkin_select on causelaw_yinguo_v1.daily_checkin
for select using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_daily_checkin_insert on causelaw_yinguo_v1.daily_checkin;
create policy yinguo_daily_checkin_insert on causelaw_yinguo_v1.daily_checkin
for insert with check (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_daily_checkin_update on causelaw_yinguo_v1.daily_checkin;
create policy yinguo_daily_checkin_update on causelaw_yinguo_v1.daily_checkin
for update using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

-- tasks

drop policy if exists yinguo_tasks_select on causelaw_yinguo_v1.tasks;
create policy yinguo_tasks_select on causelaw_yinguo_v1.tasks
for select using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_tasks_insert on causelaw_yinguo_v1.tasks;
create policy yinguo_tasks_insert on causelaw_yinguo_v1.tasks
for insert with check (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_tasks_update on causelaw_yinguo_v1.tasks;
create policy yinguo_tasks_update on causelaw_yinguo_v1.tasks
for update using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

-- wall_entries

drop policy if exists yinguo_wall_entries_select on causelaw_yinguo_v1.wall_entries;
create policy yinguo_wall_entries_select on causelaw_yinguo_v1.wall_entries
for select using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_wall_entries_insert on causelaw_yinguo_v1.wall_entries;
create policy yinguo_wall_entries_insert on causelaw_yinguo_v1.wall_entries
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_wall_entries_update on causelaw_yinguo_v1.wall_entries;
create policy yinguo_wall_entries_update on causelaw_yinguo_v1.wall_entries
for update using (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin())
with check (member_id = auth.uid() or causelaw_yinguo_v1.is_moderator_or_admin());

-- =========================================================
-- RPC (schema-isolated)
-- =========================================================

create or replace function causelaw_yinguo_v1.ensure_member_profile(p_display_name text default null)
returns causelaw_yinguo_v1.members
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_row causelaw_yinguo_v1.members;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_name is null then
    v_name := '匿名';
  end if;

  insert into causelaw_yinguo_v1.members (id, email, display_name)
  values (v_uid, v_email, v_name)
  on conflict (id) do update
    set
      email = coalesce(excluded.email, causelaw_yinguo_v1.members.email),
      display_name = case
        when causelaw_yinguo_v1.members.display_name is null
          or btrim(causelaw_yinguo_v1.members.display_name) = ''
          or causelaw_yinguo_v1.members.display_name = '匿名'
        then excluded.display_name
        else causelaw_yinguo_v1.members.display_name
      end,
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function causelaw_yinguo_v1.submit_post(
  p_display_name text,
  p_title text,
  p_category text default '其他',
  p_content text default null
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), '匿名');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_category text := coalesce(nullif(btrim(coalesce(p_category, '')), ''), '其他');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_row causelaw_yinguo_v1.posts;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再投稿。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可投稿，請聯絡管理員。';
  end if;

  if v_title is null or v_content is null then
    raise exception using message = '投稿標題與內容不可空白。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(v_name);

  select count(*)
    into v_count
    from causelaw_yinguo_v1.posts
   where user_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 3 then
    raise exception using message = '今日投稿已達 3 篇上限，請明日再提交新的案例。';
  end if;

  insert into causelaw_yinguo_v1.posts (
    user_id, display_name, title, content, category, status
  )
  values (
    v_uid, v_name, v_title, v_content, v_category, 'pending'
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function causelaw_yinguo_v1.submit_comment(
  p_post_id uuid,
  p_display_name text,
  p_content text,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), '匿名');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_comment causelaw_yinguo_v1.comments;
  v_comment_count int := 0;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再留言。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可留言，請聯絡管理員。';
  end if;

  if p_post_id is null or v_content is null then
    raise exception using message = '留言內容不可空白。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(v_name);

  if not exists (
    select 1
      from causelaw_yinguo_v1.posts
     where id = p_post_id
       and status = 'approved'
  ) then
    raise exception using message = '此投稿目前不可留言。';
  end if;

  if p_parent_id is not null and not exists (
    select 1
      from causelaw_yinguo_v1.comments
     where id = p_parent_id
       and post_id = p_post_id
  ) then
    raise exception using message = '回覆目標不存在或已失效。';
  end if;

  select count(*)
    into v_count
    from causelaw_yinguo_v1.comments
   where user_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 20 then
    raise exception using message = '今日留言已達 20 則上限，請明日再繼續分享與回應。';
  end if;

  insert into causelaw_yinguo_v1.comments (
    post_id, user_id, display_name, content, parent_id
  )
  values (
    p_post_id, v_uid, v_name, v_content, p_parent_id
  )
  returning * into v_comment;

  update causelaw_yinguo_v1.posts
     set comment_count = comment_count + 1
   where id = p_post_id
     and status = 'approved'
  returning comment_count into v_comment_count;

  return jsonb_build_object(
    'comment', to_jsonb(v_comment),
    'comment_count', v_comment_count
  );
end;
$$;

create or replace function causelaw_yinguo_v1.create_wall_entry(
  p_entry_type text,
  p_target text default null,
  p_author_name text default null,
  p_text_content text default null,
  p_is_anonymous boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_entry_type text := nullif(btrim(coalesce(p_entry_type, '')), '');
  v_target text := nullif(btrim(coalesce(p_target, '')), '');
  v_author_name text := nullif(btrim(coalesce(p_author_name, '')), '');
  v_text text := nullif(btrim(coalesce(p_text_content, '')), '');
  v_normalized text;
  v_is_anonymous boolean := coalesce(p_is_anonymous, true);
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_row causelaw_yinguo_v1.wall_entries;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再同步祈福或懺悔。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可同步祈福或懺悔，請聯絡管理員。';
  end if;

  if v_entry_type not in ('bless', 'confess') then
    raise exception using message = '牆面內容類型無效。';
  end if;

  if v_text is null then
    raise exception using message = '祈福或懺悔內容不可空白。';
  end if;

  if v_author_name is null then
    v_is_anonymous := true;
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(coalesce(v_author_name, '匿名'));

  select count(*)
    into v_count
    from causelaw_yinguo_v1.wall_entries
   where member_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 5 then
    raise exception using message = '今日懺悔與祈福合計已達 5 則上限，請明日再繼續。';
  end if;

  v_normalized := regexp_replace(v_text, '\s+', ' ', 'g');

  if exists (
    select 1
      from causelaw_yinguo_v1.wall_entries
     where member_id = v_uid
       and timezone('Asia/Taipei', created_at)::date = v_today
       and regexp_replace(btrim(text_content), '\s+', ' ', 'g') = v_normalized
  ) then
    raise exception using message = '每一則懺悔或祈福內容需要與前幾則略有不同，請調整文字再送出。';
  end if;

  insert into causelaw_yinguo_v1.wall_entries (
    member_id, entry_type, target, author_name, text_content, is_anonymous, source
  )
  values (
    v_uid, v_entry_type, v_target, v_author_name, v_text, v_is_anonymous, 'web'
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function causelaw_yinguo_v1.increment_post_view(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_next int;
begin
  if p_post_id is null then
    return null;
  end if;

  update causelaw_yinguo_v1.posts
     set view_count = view_count + 1
   where id = p_post_id
     and status = 'approved'
  returning view_count into v_next;

  return v_next;
end;
$$;

create or replace function causelaw_yinguo_v1.increment_post_comment_count(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_next int;
begin
  if p_post_id is null then
    return null;
  end if;

  update causelaw_yinguo_v1.posts
     set comment_count = comment_count + 1
   where id = p_post_id
     and status = 'approved'
  returning comment_count into v_next;

  return v_next;
end;
$$;

create or replace function causelaw_yinguo_v1.increment_comment_like(p_comment_id uuid)
returns int
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_next int;
  v_inserted int := 0;
begin
  if p_comment_id is null then
    return null;
  end if;

  if v_uid is null then
    raise exception using message = '請先登入會員後再按讚。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可按讚，請聯絡管理員。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(null);

  insert into causelaw_yinguo_v1.comment_likes (comment_id, member_id)
  select p_comment_id, v_uid
   from causelaw_yinguo_v1.comments c
   join causelaw_yinguo_v1.posts p on p.id = c.post_id
  where c.id = p_comment_id
    and p.status = 'approved'
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update causelaw_yinguo_v1.comments c
       set like_count = c.like_count + 1
     where c.id = p_comment_id
       and exists (
         select 1
           from causelaw_yinguo_v1.posts p
          where p.id = c.post_id
            and p.status = 'approved'
       )
    returning c.like_count into v_next;
  else
    select c.like_count
      into v_next
      from causelaw_yinguo_v1.comments c
     where c.id = p_comment_id;
  end if;

  return v_next;
end;
$$;

revoke all on function causelaw_yinguo_v1.ensure_member_profile(text) from public;
revoke all on function causelaw_yinguo_v1.submit_post(text, text, text, text) from public;
revoke all on function causelaw_yinguo_v1.submit_comment(uuid, text, text, uuid) from public;
revoke all on function causelaw_yinguo_v1.create_wall_entry(text, text, text, text, boolean) from public;
revoke all on function causelaw_yinguo_v1.increment_post_view(uuid) from public;
revoke all on function causelaw_yinguo_v1.increment_post_comment_count(uuid) from public;
revoke all on function causelaw_yinguo_v1.increment_comment_like(uuid) from public;

grant execute on function causelaw_yinguo_v1.ensure_member_profile(text) to authenticated;
grant execute on function causelaw_yinguo_v1.submit_post(text, text, text, text) to authenticated;
grant execute on function causelaw_yinguo_v1.submit_comment(uuid, text, text, uuid) to authenticated;
grant execute on function causelaw_yinguo_v1.create_wall_entry(text, text, text, text, boolean) to authenticated;
grant execute on function causelaw_yinguo_v1.increment_post_view(uuid) to anon, authenticated;
grant execute on function causelaw_yinguo_v1.increment_comment_like(uuid) to authenticated;

-- 收斂既有資料表權限，避免新表忘記開 RLS 時被 anon/authenticated 直接讀寫
revoke all on all tables in schema causelaw_yinguo_v1 from anon, authenticated;
revoke all on all sequences in schema causelaw_yinguo_v1 from anon, authenticated;

grant select on table causelaw_yinguo_v1.posts, causelaw_yinguo_v1.comments to anon, authenticated;

grant select, insert, update on table causelaw_yinguo_v1.members to authenticated;
grant update on table causelaw_yinguo_v1.posts to authenticated;
grant insert on table causelaw_yinguo_v1.moderation_audit_log to authenticated;
grant select, insert, update on table causelaw_yinguo_v1.daily_checkin to authenticated;
grant select, insert, update on table causelaw_yinguo_v1.tasks to authenticated;
grant select on table causelaw_yinguo_v1.wall_entries to authenticated;

grant all on all tables in schema causelaw_yinguo_v1 to service_role;
grant all on all sequences in schema causelaw_yinguo_v1 to service_role;

alter default privileges in schema causelaw_yinguo_v1
revoke all on tables from anon, authenticated;

alter default privileges in schema causelaw_yinguo_v1
revoke all on sequences from anon, authenticated;

alter default privileges in schema causelaw_yinguo_v1
grant all on tables to service_role;

alter default privileges in schema causelaw_yinguo_v1
grant all on sequences to service_role;

-- 共用資料庫下，請在 Supabase Dashboard -> API Settings -> Exposed schemas
-- 手動加入 causelaw_yinguo_v1，不要在 migration 內直接覆寫 pgrst.db_schemas
notify pgrst, 'reload schema';

commit;
