-- 2026-03-07: 投稿自動審核（不雅文字檢測）

create or replace function causelaw_yinguo_v1.detect_profanity_terms(
  p_text text
)
returns text[]
language plpgsql
immutable
set search_path = causelaw_yinguo_v1, public
as $$
declare
  v_text text := lower(coalesce(p_text, ''));
  v_terms text[] := array[
    '幹你娘', '干你娘', '幹你媽', '干你媽', '操你媽', '操你妈',
    '靠北', '靠杯', '雞巴', '鸡巴', '雞掰', '机掰', '機掰',
    '懶叫', '他媽的', '他妈的', '婊子', '王八蛋', '去死', '死全家',
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt'
  ];
  v_hits text[] := array[]::text[];
  v_term text;
begin
  if v_text = '' then
    return v_hits;
  end if;

  foreach v_term in array v_terms loop
    if position(lower(v_term) in v_text) > 0 then
      v_hits := array_append(v_hits, v_term);
    end if;
  end loop;

  return v_hits;
end;
$$;

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
  v_detect_text text := '';
  v_hits text[] := array[]::text[];
  v_status text := 'approved';
  v_reason text := null;
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

  v_detect_text := v_title || E'\n' || v_content;
  v_hits := causelaw_yinguo_v1.detect_profanity_terms(v_detect_text);
  if coalesce(array_length(v_hits, 1), 0) > 0 then
    v_status := 'pending';
    v_reason := '系統偵測可能含不雅文字：' || array_to_string(v_hits, '、') || '。請人工複核。';
  end if;

  insert into causelaw_yinguo_v1.posts (
    user_id, display_name, title, content, category, status, moderation_reason
  )
  values (
    v_uid, v_name, v_title, v_content, v_category, v_status, v_reason
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;
