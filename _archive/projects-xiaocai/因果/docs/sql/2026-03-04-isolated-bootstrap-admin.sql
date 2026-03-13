-- 因果真相：隔離 schema 管理員開通腳本
-- 日期：2026-03-04
-- 依賴：docs/sql/2026-03-04-shared-db-isolation-v1.sql

-- A. 單一帳號升級（先用這段測試）
with target_user as (
  select id, email
  from auth.users
  where lower(email) = lower('andy825lay@gmail.com')
  limit 1
)
insert into causelaw_yinguo_v1.members (id, email, display_name, role, status)
select
  target_user.id,
  target_user.email,
  '站務管理員',
  'superadmin',
  'active'
from target_user
on conflict (id) do update
set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

-- B. 驗證
select id, email, display_name, role, status, created_at, updated_at
from causelaw_yinguo_v1.members
where role in ('moderator', 'admin', 'superadmin')
order by role, created_at;
