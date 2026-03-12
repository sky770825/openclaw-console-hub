# Shared DB Isolation v1 (causelaw_yinguo_v1)

## Execute order
1. `2026-03-04-shared-db-isolation-v1.sql`
2. `2026-03-04-isolated-bootstrap-admin.sql` (optional, for backend admin access)
3. `2026-03-06-members-role-hardening-hotfix.sql` (required for existing DBs created before 2026-03-06)
4. `2026-03-06-engagement-guardrails-hotfix.sql` (required for existing DBs if you want server-side post/comment/wall/like guardrails)
5. `2026-03-06-schema-privileges-hardening-hotfix.sql` (required for existing DBs to remove broad anon/authenticated table grants)
6. `2026-03-06-pgrst-db-schemas-reset-optional.sql` (optional, only after Dashboard exposed schemas already includes `causelaw_yinguo_v1`)

## Supabase settings
1. API Settings -> Exposed schemas: add `causelaw_yinguo_v1`
2. Authentication -> URL Configuration -> add all site URLs to Redirect URLs
3. Shared DB: do not use `ALTER ROLE authenticator SET pgrst.db_schemas = ...` in migration SQL; manage exposed schemas in the Dashboard only
4. If an older shared DB migration already overwrote `pgrst.db_schemas`, only then consider `2026-03-06-pgrst-db-schemas-reset-optional.sql`, and only after confirming the Dashboard setting is correct

## Frontend config
- `causelaw-config.js`
  - `CAUSELAW_SUPABASE_URL`
  - `CAUSELAW_SUPABASE_ANON_KEY`
  - `CAUSELAW_DB_SCHEMA='causelaw_yinguo_v1'`

## Security
- Never put `service_role` key in frontend files.
- If `service_role` key has been shared, rotate it immediately in Supabase dashboard.
- For future tables, add grants explicitly table-by-table. Do not restore schema-wide CRUD grants for `anon/authenticated`.
