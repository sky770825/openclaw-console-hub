-- 因果真相：會員修行橋接 v1
-- 日期：2026-03-01
-- 依賴：
-- 1) docs/sql/2026-02-28-membership-v1.sql
-- 2) docs/sql/2026-02-28-smart-assistant-v1-isolated-schema.sql

begin;

create schema if not exists causelaw_assistant;

-- =========================================================
-- 祈福 / 懺悔牆雲端資料
-- =========================================================

create table if not exists causelaw_assistant.wall_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.causelaw_members(id) on delete cascade,
  entry_type text not null check (entry_type in ('bless', 'confess')),
  target text,
  author_name text,
  text_content text not null check (length(trim(text_content)) > 0),
  is_anonymous boolean not null default true,
  source text not null default 'web' check (source in ('web', 'api', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ca_wall_entries_member_created
  on causelaw_assistant.wall_entries(member_id, created_at desc);
create index if not exists idx_ca_wall_entries_type_created
  on causelaw_assistant.wall_entries(entry_type, created_at desc);

alter table causelaw_assistant.wall_entries enable row level security;

drop policy if exists ca_wall_entries_select on causelaw_assistant.wall_entries;
create policy ca_wall_entries_select on causelaw_assistant.wall_entries
for select using (
  member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin()
);

drop policy if exists ca_wall_entries_insert on causelaw_assistant.wall_entries;
create policy ca_wall_entries_insert on causelaw_assistant.wall_entries
for insert with check (
  member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin()
);

drop policy if exists ca_wall_entries_update on causelaw_assistant.wall_entries;
create policy ca_wall_entries_update on causelaw_assistant.wall_entries
for update using (
  member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin()
)
with check (
  member_id = auth.uid() or causelaw_assistant.is_moderator_or_admin()
);

commit;
