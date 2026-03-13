# OpenClaw Task Status Migration Runbook

This runbook upgrades `public.openclaw_tasks.status` constraint safely.

## Scope

- Keep current system behavior.
- Only expand allowed status values.
- No app logic rewrite required.

## Files

- Up migration:
  - `supabase/migrations/20260302_openclaw_tasks_status_expand_safe.sql`
- Rollback migration:
  - `supabase/migrations/20260302_openclaw_tasks_status_expand_safe_down.sql`

## Apply (manual)

1. Open Supabase SQL Editor.
2. Run `20260302_openclaw_tasks_status_expand_safe.sql`.
3. Restart taskboard service after migration.

## Verify

Run these checks:

1. Dispatch review appears in board `review` column.
2. `taskboard-error.log` no longer grows with `openclaw_tasks_status_check`.
3. `/api/openclaw/dispatch/status` and `/api/openclaw/tasks` remain consistent.

## Rollback

If needed, run `20260302_openclaw_tasks_status_expand_safe_down.sql`.

