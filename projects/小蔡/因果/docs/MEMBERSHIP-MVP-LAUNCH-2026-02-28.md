# 會員系統 MVP 啟動清單（2026-02-28）

## 已完成的前端落地

- Email OTP 會員登入入口（首頁、討論區）
- 會員顯示名稱儲存（本地 profile）
- 首頁投稿：優先寫入 Supabase `causelaw_posts`（失敗自動 fallback 本地）
- 討論區：優先讀取 Supabase 已審核投稿（`status=approved`）
- 投稿詳情：優先讀取 Supabase 單篇內容與留言
- 留言提交：支援 Supabase `causelaw_comments`
- 後台審核：支援 Supabase `pending -> approved/rejected`

## 你現在要做的 4 步

1. 在 Supabase 建表與 RLS  
   請執行 [SUPABASE-SETUP.md](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/SUPABASE-SETUP.md) 的 SQL。

2. 填設定檔  
   編輯 [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js)：
   - `window.CAUSELAW_SUPABASE_URL`
   - `window.CAUSELAW_SUPABASE_ANON_KEY`

3. 驗證會員流程  
   - 首頁點「會員登入」寄 OTP
   - 登入後投稿一篇，確認進入 `pending`
   - 後台 `pages/admin.html` 以管理員角色登入後審核通過
   - `pages/forum.html` 能看到新稿，點入 `pages/post.html?id=<uuid>`
   - 在詳情頁留言，確認 `causelaw_comments` 有新資料

4. 驗證 fallback（防斷線）  
   把 `causelaw-config.js` 先清空後測一次投稿，應自動走本地暫存，不會丟資料。

## 注意事項

- `anon key` 可放前端；`service role key` 絕對不可放前端。
- 後台已改為 Supabase OTP + `causelaw_members.role` 門禁（`moderator/admin/superadmin`）。
- 目前 `user_id` 先不強制綁定，MVP 以 `display_name` 為主。
