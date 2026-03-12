-- 因果真相：首批管理員啟用腳本
-- 日期：2026-03-01
-- 用途：將已存在於 auth.users 的帳號，建立/升級為 causelaw_members 管理角色
--
-- 使用前提：
-- 1) 已執行 docs/sql/2026-02-28-membership-v1.sql
-- 2) 目標信箱已先完成一次 OTP 登入，存在於 auth.users

-- =========================================================
-- A. 單一帳號升級（推薦先測這段）
-- =========================================================

with target_user as (
  select id, email
  from auth.users
  where lower(email) = lower('admin@example.com') -- TODO: 改成你的管理員信箱
  limit 1
)
insert into public.causelaw_members (id, email, display_name, role, status)
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

-- =========================================================
-- B. 批次帳號升級（可選）
-- =========================================================
-- 說明：同一批同時建立 member / moderator / admin / superadmin。
-- 只有在 auth.users 找得到的 email 才會被寫入 causelaw_members。

with role_map(email, role_name, display_name) as (
  values
    ('member@example.com', 'member', '一般會員'),
    ('moderator@example.com', 'moderator', '內容審核員'),
    ('admin@example.com', 'admin', '站務管理員'),
    ('superadmin@example.com', 'superadmin', '系統管理員')
),
target_users as (
  select u.id, u.email, r.role_name, r.display_name
  from auth.users u
  join role_map r on lower(u.email) = lower(r.email)
)
insert into public.causelaw_members (id, email, display_name, role, status)
select
  t.id,
  t.email,
  t.display_name,
  t.role_name,
  'active'
from target_users t
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

-- =========================================================
-- C. 驗證結果
-- =========================================================

select id, email, display_name, role, status, created_at, updated_at
from public.causelaw_members
where role in ('moderator', 'admin', 'superadmin')
order by role, created_at;
