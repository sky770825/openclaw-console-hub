-- 因果真相：會員角色欄位防升權 hotfix（shared schema）
-- 日期：2026-03-06
-- 依賴：docs/sql/2026-03-04-shared-db-isolation-v1.sql
-- 目的：避免使用者自行把 members.role/status 改成管理權限

begin;

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

commit;
