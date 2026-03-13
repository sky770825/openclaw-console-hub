-- Rollback for 20260302_openclaw_tasks_status_expand_safe.sql
-- Note: before shrinking status set, normalize rows to old values.

begin;

-- 1) Normalize extended statuses to legacy set.
update public.openclaw_tasks
set status = case
  when status in ('pending_review', 'retrying') then 'queued'
  when status in ('needs_review', 'failed', 'blocked', 'cancelled', 'timeout') then 'done'
  else status
end
where status not in ('queued', 'in_progress', 'done');

-- 2) Drop expanded constraint if exists.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'openclaw_tasks_status_check'
      and conrelid = 'public.openclaw_tasks'::regclass
  ) then
    alter table public.openclaw_tasks
      drop constraint openclaw_tasks_status_check;
  end if;
end $$;

-- 3) Restore legacy constraint.
alter table public.openclaw_tasks
  add constraint openclaw_tasks_status_check
  check (status in ('queued', 'in_progress', 'done'));

commit;

