# 2026-03-06 Access Smoke Checklist

目的：快速驗證 `anon`、一般 `authenticated` 會員、`moderator/admin` 在前台與後台的權限是否符合預期。

## 測試前準備
- 準備 2 個帳號：
  - `member_active`：`members.role='member'`、`status='active'`
  - `admin_active`：`members.role in ('moderator','admin','superadmin')`、`status='active'`
- 確認已執行：
  - `2026-03-06-members-role-hardening-hotfix.sql`
  - `2026-03-06-engagement-guardrails-hotfix.sql`
  - `2026-03-06-schema-privileges-hardening-hotfix.sql`
- Shared DB 環境需先確認 Supabase Dashboard -> `API Settings -> Exposed schemas` 已包含 `causelaw_yinguo_v1`

## Anon
- [ ] 開 [首頁](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/index.html)，可正常瀏覽
- [ ] 開 [討論區](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/forum.html)，可看到已核准文章列表
- [ ] 開 [文章頁](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/post.html)，可看到已核准文章與留言
- [ ] 在首頁投稿，預期：若站點已接 Supabase，應提示「請先登入會員後再投稿」
- [ ] 在文章頁留言，預期：應提示「請先登入會員後再留言」
- [ ] 在文章頁留言按讚，預期：應提示「請先登入會員後再按讚」
- [ ] 開 [任務中心](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/tasks.html)，預期：提示尚未登入會員
- [ ] 開 [功過格](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/merit.html) 後點同步，預期：提示尚未登入會員
- [ ] 開 [懺悔牆](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/wall.html)，預期：可看本機內容，但不會載入會員雲端牆

## Authenticated Member
- [ ] 用 `member_active` 登入後開首頁，投稿成功進入待審核
- [ ] 同帳號一天第 4 篇投稿，預期：被後端拒絕，訊息包含 `今日投稿已達 3 篇上限`
- [ ] 開已核准文章頁留言成功
- [ ] 同帳號一天第 21 則留言，預期：被後端拒絕，訊息包含 `今日留言已達 20 則上限`
- [ ] 對同一則留言按讚一次成功，再按第二次，預期：前端不再增加數字；重新整理後數字仍只增加 1
- [ ] 到懺悔牆發一則祈福或懺悔，預期：成功同步雲端
- [ ] 同帳號同一天第 6 則牆面內容，預期：被後端拒絕，訊息包含 `今日懺悔與祈福合計已達 5 則上限`
- [ ] 同帳號同一天送出相同牆面文字，預期：被後端拒絕，訊息包含 `內容需要與前幾則略有不同`
- [ ] 開任務中心，預期：只看到自己的 `tasks`
- [ ] 在任務中心更新任務進度，重新整理後進度仍存在
- [ ] 在功過格同步今日紀錄，預期：成功建立 `daily_checkin` 與今日任務
- [ ] 同一天再次同步功過格，預期：前端提示 `今日功過已同步過一次`
- [ ] 直接開 [後台](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/admin.html)，預期：顯示 `權限不足`

## Moderator / Admin
- [ ] 用 `admin_active` 登入 [後台](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/pages/admin.html)，預期：可通過驗證並看到待審核投稿
- [ ] 後台通過一篇投稿，預期：文章狀態變 `approved`
- [ ] 後台拒絕一篇投稿，預期：文章狀態變 `rejected`
- [ ] 後台審核時不填理由，預期：前端阻止送出
- [ ] 審核後確認 `moderation_audit_log` 有對應紀錄

## Optional SQL Checks
- [ ] `anon` / 一般 `authenticated` 無法直接 `insert` 到 `posts`
- [ ] `anon` / 一般 `authenticated` 無法直接 `insert` 到 `comments`
- [ ] `anon` / 一般 `authenticated` 無法直接 `insert` 到 `wall_entries`
- [ ] 一般 `authenticated` 無法直接 `update posts set status='approved'`
- [ ] 一般 `authenticated` 無法把自己的 `members.role` 或 `members.status` 改掉
- [ ] `authenticated` 可執行 `submit_post`
- [ ] `authenticated` 可執行 `submit_comment`
- [ ] `authenticated` 可執行 `create_wall_entry`
- [ ] `authenticated` 可執行 `increment_comment_like`
- [ ] `anon` 僅可讀已公開文章與其留言，不可存取私人會員資料

## Shared DB Checks
- [ ] `API Settings -> Exposed schemas` 包含 `causelaw_yinguo_v1`
- [ ] 主 migration 或 hotfix 內沒有再出現 `ALTER ROLE authenticator SET pgrst.db_schemas = ...`
- [ ] 若舊環境曾寫過 role-level `pgrst.db_schemas`，且 Dashboard 已正確設定，再執行 `2026-03-06-pgrst-db-schemas-reset-optional.sql`

## 判定標準
- 全部勾完才算這輪權限修補完成
- 若失敗項目出現在 UI，但 SQL 預期正確，先檢查前端是否仍走舊 API 路徑
- 若失敗項目出現在 SQL，優先檢查 hotfix 是否已在正確 Supabase 專案執行
