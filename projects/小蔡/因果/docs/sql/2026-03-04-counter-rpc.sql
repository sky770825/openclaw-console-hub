-- 因果真相：討論區計數 RPC（原子遞增）
-- 日期：2026-03-04
-- 目的：避免前端覆寫計數造成競態或 RLS 衝突

begin;

create or replace function public.increment_post_view(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if p_post_id is null then
    return null;
  end if;

  update public.causelaw_posts
     set view_count = view_count + 1
   where id = p_post_id
     and status = 'approved'
  returning view_count into v_next;

  return v_next;
end;
$$;

create or replace function public.increment_post_comment_count(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if p_post_id is null then
    return null;
  end if;

  update public.causelaw_posts
     set comment_count = comment_count + 1
   where id = p_post_id
  returning comment_count into v_next;

  return v_next;
end;
$$;

create or replace function public.increment_comment_like(p_comment_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if p_comment_id is null then
    return null;
  end if;

  update public.causelaw_comments c
     set like_count = c.like_count + 1
   where c.id = p_comment_id
     and exists (
       select 1
         from public.causelaw_posts p
        where p.id = c.post_id
          and p.status = 'approved'
     )
  returning c.like_count into v_next;

  return v_next;
end;
$$;

revoke all on function public.increment_post_view(uuid) from public;
revoke all on function public.increment_post_comment_count(uuid) from public;
revoke all on function public.increment_comment_like(uuid) from public;

grant execute on function public.increment_post_view(uuid) to anon, authenticated;
grant execute on function public.increment_post_comment_count(uuid) to anon, authenticated;
grant execute on function public.increment_comment_like(uuid) to anon, authenticated;

commit;
