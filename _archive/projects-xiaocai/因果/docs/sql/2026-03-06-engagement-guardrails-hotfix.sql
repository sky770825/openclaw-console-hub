-- 2026-03-06: engagement guardrails hotfix
-- Apply to existing DBs that already ran 2026-03-04-shared-db-isolation-v1.sql

create or replace function causelaw_yinguo_v1.current_local_date()
returns date
language sql
stable
set search_path = causelaw_yinguo_v1, public
as $$
  select timezone('Asia/Taipei', now())::date;
$$;

create table if not exists causelaw_yinguo_v1.comment_likes (
  comment_id uuid not null references causelaw_yinguo_v1.comments(id) on delete cascade,
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

create index if not exists idx_yinguo_comment_likes_member_created
  on causelaw_yinguo_v1.comment_likes(member_id, created_at desc);

alter table causelaw_yinguo_v1.comment_likes enable row level security;

drop policy if exists yinguo_posts_insert on causelaw_yinguo_v1.posts;
create policy yinguo_posts_insert on causelaw_yinguo_v1.posts
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_comments_insert on causelaw_yinguo_v1.comments;
create policy yinguo_comments_insert on causelaw_yinguo_v1.comments
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

drop policy if exists yinguo_wall_entries_insert on causelaw_yinguo_v1.wall_entries;
create policy yinguo_wall_entries_insert on causelaw_yinguo_v1.wall_entries
for insert with check (causelaw_yinguo_v1.is_moderator_or_admin());

create or replace function causelaw_yinguo_v1.submit_post(
  p_display_name text,
  p_title text,
  p_category text default '其他',
  p_content text default null
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), '匿名');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_category text := coalesce(nullif(btrim(coalesce(p_category, '')), ''), '其他');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_row causelaw_yinguo_v1.posts;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再投稿。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可投稿，請聯絡管理員。';
  end if;

  if v_title is null or v_content is null then
    raise exception using message = '投稿標題與內容不可空白。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(v_name);

  select count(*)
    into v_count
    from causelaw_yinguo_v1.posts
   where user_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 3 then
    raise exception using message = '今日投稿已達 3 篇上限，請明日再提交新的案例。';
  end if;

  insert into causelaw_yinguo_v1.posts (
    user_id, display_name, title, content, category, status
  )
  values (
    v_uid, v_name, v_title, v_content, v_category, 'pending'
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function causelaw_yinguo_v1.submit_comment(
  p_post_id uuid,
  p_display_name text,
  p_content text,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), '匿名');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_comment causelaw_yinguo_v1.comments;
  v_comment_count int := 0;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再留言。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可留言，請聯絡管理員。';
  end if;

  if p_post_id is null or v_content is null then
    raise exception using message = '留言內容不可空白。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(v_name);

  if not exists (
    select 1
      from causelaw_yinguo_v1.posts
     where id = p_post_id
       and status = 'approved'
  ) then
    raise exception using message = '此投稿目前不可留言。';
  end if;

  if p_parent_id is not null and not exists (
    select 1
      from causelaw_yinguo_v1.comments
     where id = p_parent_id
       and post_id = p_post_id
  ) then
    raise exception using message = '回覆目標不存在或已失效。';
  end if;

  select count(*)
    into v_count
    from causelaw_yinguo_v1.comments
   where user_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 20 then
    raise exception using message = '今日留言已達 20 則上限，請明日再繼續分享與回應。';
  end if;

  insert into causelaw_yinguo_v1.comments (
    post_id, user_id, display_name, content, parent_id
  )
  values (
    p_post_id, v_uid, v_name, v_content, p_parent_id
  )
  returning * into v_comment;

  update causelaw_yinguo_v1.posts
     set comment_count = comment_count + 1
   where id = p_post_id
     and status = 'approved'
  returning comment_count into v_comment_count;

  return jsonb_build_object(
    'comment', to_jsonb(v_comment),
    'comment_count', v_comment_count
  );
end;
$$;

create or replace function causelaw_yinguo_v1.create_wall_entry(
  p_entry_type text,
  p_target text default null,
  p_author_name text default null,
  p_text_content text default null,
  p_is_anonymous boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_entry_type text := nullif(btrim(coalesce(p_entry_type, '')), '');
  v_target text := nullif(btrim(coalesce(p_target, '')), '');
  v_author_name text := nullif(btrim(coalesce(p_author_name, '')), '');
  v_text text := nullif(btrim(coalesce(p_text_content, '')), '');
  v_normalized text;
  v_is_anonymous boolean := coalesce(p_is_anonymous, true);
  v_today date := causelaw_yinguo_v1.current_local_date();
  v_count int := 0;
  v_row causelaw_yinguo_v1.wall_entries;
begin
  if v_uid is null then
    raise exception using message = '請先登入會員後再同步祈福或懺悔。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可同步祈福或懺悔，請聯絡管理員。';
  end if;

  if v_entry_type not in ('bless', 'confess') then
    raise exception using message = '牆面內容類型無效。';
  end if;

  if v_text is null then
    raise exception using message = '祈福或懺悔內容不可空白。';
  end if;

  if v_author_name is null then
    v_is_anonymous := true;
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(coalesce(v_author_name, '匿名'));

  select count(*)
    into v_count
    from causelaw_yinguo_v1.wall_entries
   where member_id = v_uid
     and timezone('Asia/Taipei', created_at)::date = v_today;

  if v_count >= 5 then
    raise exception using message = '今日懺悔與祈福合計已達 5 則上限，請明日再繼續。';
  end if;

  v_normalized := regexp_replace(v_text, '\s+', ' ', 'g');

  if exists (
    select 1
      from causelaw_yinguo_v1.wall_entries
     where member_id = v_uid
       and timezone('Asia/Taipei', created_at)::date = v_today
       and regexp_replace(btrim(text_content), '\s+', ' ', 'g') = v_normalized
  ) then
    raise exception using message = '每一則懺悔或祈福內容需要與前幾則略有不同，請調整文字再送出。';
  end if;

  insert into causelaw_yinguo_v1.wall_entries (
    member_id, entry_type, target, author_name, text_content, is_anonymous, source
  )
  values (
    v_uid, v_entry_type, v_target, v_author_name, v_text, v_is_anonymous, 'web'
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function causelaw_yinguo_v1.increment_comment_like(p_comment_id uuid)
returns int
language plpgsql
security definer
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_uid uuid := auth.uid();
  v_next int;
  v_inserted int := 0;
begin
  if p_comment_id is null then
    return null;
  end if;

  if v_uid is null then
    raise exception using message = '請先登入會員後再按讚。';
  end if;

  if causelaw_yinguo_v1.current_member_status() <> 'active' then
    raise exception using message = '會員狀態不可按讚，請聯絡管理員。';
  end if;

  perform causelaw_yinguo_v1.ensure_member_profile(null);

  insert into causelaw_yinguo_v1.comment_likes (comment_id, member_id)
  select p_comment_id, v_uid
    from causelaw_yinguo_v1.comments c
    join causelaw_yinguo_v1.posts p on p.id = c.post_id
   where c.id = p_comment_id
     and p.status = 'approved'
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update causelaw_yinguo_v1.comments c
       set like_count = c.like_count + 1
     where c.id = p_comment_id
       and exists (
         select 1
           from causelaw_yinguo_v1.posts p
          where p.id = c.post_id
            and p.status = 'approved'
       )
    returning c.like_count into v_next;
  else
    select c.like_count
      into v_next
      from causelaw_yinguo_v1.comments c
     where c.id = p_comment_id;
  end if;

  return v_next;
end;
$$;

revoke all on function causelaw_yinguo_v1.submit_post(text, text, text, text) from public;
revoke all on function causelaw_yinguo_v1.submit_comment(uuid, text, text, uuid) from public;
revoke all on function causelaw_yinguo_v1.create_wall_entry(text, text, text, text, boolean) from public;
revoke all on function causelaw_yinguo_v1.increment_post_comment_count(uuid) from public;
revoke all on function causelaw_yinguo_v1.increment_comment_like(uuid) from public;

grant execute on function causelaw_yinguo_v1.submit_post(text, text, text, text) to authenticated;
grant execute on function causelaw_yinguo_v1.submit_comment(uuid, text, text, uuid) to authenticated;
grant execute on function causelaw_yinguo_v1.create_wall_entry(text, text, text, text, boolean) to authenticated;
grant execute on function causelaw_yinguo_v1.increment_comment_like(uuid) to authenticated;
