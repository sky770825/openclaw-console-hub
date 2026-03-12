-- 2026-03-06: schema privileges hardening hotfix
-- Apply to existing DBs that already ran 2026-03-04-shared-db-isolation-v1.sql

revoke all on all tables in schema causelaw_yinguo_v1 from anon, authenticated;
revoke all on all sequences in schema causelaw_yinguo_v1 from anon, authenticated;

grant select on table causelaw_yinguo_v1.posts, causelaw_yinguo_v1.comments to anon, authenticated;

grant select, insert, update on table causelaw_yinguo_v1.members to authenticated;
grant update on table causelaw_yinguo_v1.posts to authenticated;
grant insert on table causelaw_yinguo_v1.moderation_audit_log to authenticated;
grant select, insert, update on table causelaw_yinguo_v1.daily_checkin to authenticated;
grant select, insert, update on table causelaw_yinguo_v1.tasks to authenticated;
grant select on table causelaw_yinguo_v1.wall_entries to authenticated;

alter default privileges in schema causelaw_yinguo_v1
revoke all on tables from anon, authenticated;

alter default privileges in schema causelaw_yinguo_v1
revoke all on sequences from anon, authenticated;

-- Shared DB note:
-- Do not set `pgrst.db_schemas` via ALTER ROLE in migration/hotfix SQL.
-- Manage Exposed schemas in Supabase Dashboard instead.
