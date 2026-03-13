-- 因果真相：會員首登自動建檔
-- 日期：2026-03-04
-- 目的：OTP 登入後，前端可呼叫 ensure_member_profile() 自動建立/同步 causelaw_members

begin;

create or replace function public.ensure_member_profile(p_display_name text default null)
returns public.causelaw_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_row public.causelaw_members;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_name is null then
    v_name := '匿名';
  end if;

  insert into public.causelaw_members (id, email, display_name)
  values (v_uid, v_email, v_name)
  on conflict (id) do update
    set
      email = coalesce(excluded.email, public.causelaw_members.email),
      display_name = case
        when public.causelaw_members.display_name is null
          or btrim(public.causelaw_members.display_name) = ''
          or public.causelaw_members.display_name = '匿名'
        then excluded.display_name
        else public.causelaw_members.display_name
      end,
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.ensure_member_profile(text) from public;
grant execute on function public.ensure_member_profile(text) to authenticated;

commit;
