-- Safe status expansion for openclaw_tasks
-- Goal: keep existing behavior, only expand allowed status values.
-- This migration is additive and backward compatible.

begin;

-- 1) Drop old constraint if exists.
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

-- 2) Recreate with expanded status set.
alter table public.openclaw_tasks
  add constraint openclaw_tasks_status_check
  check (
    status in (
      'queued',
      'in_progress',
      'done',
      'pending_review',
      'needs_review',
      'failed',
      'blocked',
      'retrying',
      'cancelled',
      'timeout'
    )
  );

comment on constraint openclaw_tasks_status_check on public.openclaw_tasks
  is 'Expanded for dispatch/review/failed flows. Backward compatible with queued/in_progress/done.';

commit;

