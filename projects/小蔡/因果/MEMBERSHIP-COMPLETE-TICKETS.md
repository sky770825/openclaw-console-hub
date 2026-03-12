# 會員系統完成版：7 張實作票（給 Cursor）

更新日期：2026-03-04  
目標：把目前「半成品會員系統」補齊到可穩定上線的版本

---

## Ticket 01：登入體驗正式化 + 首登自動建會員

目標：
1. 移除 `prompt/alert` 登入流程，改站內 modal。
2. 使用者 OTP 登入成功後，自動 upsert `causelaw_members`。
3. 全站統一顯示會員狀態（訪客/已登入）。

修改檔案：
- `index.html`
- `pages/forum.html`
- `pages/tasks.html`
- `pages/wall.html`
- `causelaw-client.js`
- 新增：`pages/components/auth-modal.js`（或等價共用檔）

SQL（新增 migration）：
- `docs/sql/2026-03-04-member-bootstrap.sql`
- 內容包含：
1. `public.ensure_member_profile()` function（依 `auth.uid()` upsert `causelaw_members`）。
2. `grant execute` 給 authenticated。

DoD：
1. 登入、登出、重整頁面後狀態正確。
2. 新帳號首次登入後 DB 可看到 `causelaw_members` 記錄。
3. 所有頁面都不再出現原生 `prompt/alert` 登入彈窗。

測試步驟：
1. 新信箱登入一次，檢查 `causelaw_members` 是否建立。
2. 登出再登入，會員狀態與顯示名稱保持一致。

---

## Ticket 02：投稿/留言/修行資料全綁會員 ID

目標：
1. 登入會員時，投稿與留言寫入 `user_id`。
2. 牆與功過格同步流程都以 `member_id` 為核心。
3. 匿名模式仍可用，但資料關聯清楚。

修改檔案：
- `index.html`（投稿 insert payload）
- `pages/post.html`（留言 insert payload）
- `pages/merit.html`
- `pages/wall.html`

SQL（新增 migration）：
- `docs/sql/2026-03-04-content-member-link.sql`
- 內容包含：
1. 檢查 `causelaw_posts.user_id`、`causelaw_comments.user_id` 索引與 FK 完整。
2. 必要的 backfill script（可選，僅處理可辨識資料）。

DoD：
1. 會員投稿在 `causelaw_posts.user_id` 有值。
2. 會員留言在 `causelaw_comments.user_id` 有值。
3. 匿名投稿/留言不報錯，`user_id` 可為 null。

測試步驟：
1. 登入後投稿與留言各一次，查 DB 欄位值。
2. 登出後匿名投稿與留言各一次，流程仍成功。

---

## Ticket 03：計數邏輯改後端原子遞增（避免 RLS 衝突）

目標：
1. 移除前端直接更新 `view_count/comment_count/like_count`。
2. 改用 SQL RPC 原子遞增，避免併發覆寫。
3. 政策與實作一致，不再靜默失敗。

修改檔案：
- `pages/post.html`
- `docs/sql/2026-02-28-membership-v1.sql`（或新增 patch migration）

SQL（新增 migration）：
- `docs/sql/2026-03-04-counter-rpc.sql`
- 內容包含：
1. `increment_post_view(p_post_id uuid)`
2. `increment_post_comment_count(p_post_id uuid)`
3. `increment_comment_like(p_comment_id uuid)`
4. 對 authenticated 授權執行。

DoD：
1. 前端不再 `.update({ view_count: x })` 這類覆寫。
2. 多使用者同時操作，計數最終正確。
3. 無 RLS 403 的隱性資料錯亂。

測試步驟：
1. 三個分頁同時點進同一文章，view_count 準確增加。
2. 兩個帳號同時對同留言按讚，like_count 正確。

---

## Ticket 04：會員中心頁（我的投稿/留言/任務）

目標：
1. 新增會員中心頁，集中查看個人資料。
2. 顯示：我的投稿、我的留言、今日/歷史任務。
3. 未登入時有清楚導流到登入。

修改檔案：
- 新增：`pages/member.html`
- `index.html`（新增入口）
- `pages/forum.html`（可選入口）
- `styles.css`（必要樣式）

SQL：
- 不必新增表，先用既有：
1. `causelaw_posts`
2. `causelaw_comments`
3. `causelaw_assistant.tasks`

DoD：
1. 會員可看到自己的內容且不洩漏他人資料。
2. 支援基本分頁或載入更多。
3. 任務狀態顯示與 `tasks.html` 一致。

測試步驟：
1. A 帳號新增資料，A 可見、B 不可見。
2. 登出進入 `member.html` 顯示登入提示。

---

## Ticket 05：會員資料設定（顯示名稱同步到雲端）

目標：
1. 顯示名稱不只存在 localStorage，要同步 `causelaw_members.display_name`。
2. 頭像欄位先預留（可不開放上傳，只保留資料欄位與 UI 佔位）。
3. 支援修改後全站即時生效。

修改檔案：
- `causelaw-client.js`
- `index.html`
- `pages/member.html`（Ticket 04）

SQL（如需）：
- 若 schema 未有 avatar 欄位，新增 migration：
- `docs/sql/2026-03-04-member-profile-fields.sql`

DoD：
1. 修改顯示名稱後，首頁/討論區/留言預設名稱一致。
2. 新裝置登入仍可取得雲端顯示名稱。

測試步驟：
1. 修改名稱後重新整理、跨頁檢查。
2. 換瀏覽器登入檢查名稱是否同步。

---

## Ticket 06：會員流程防濫用（頻率限制 + 輸入限制）

目標：
1. 對投稿、留言、牆發佈做速率限制。
2. 表單最小/最大長度與去空白驗證。
3. 顯示明確失敗原因。

修改檔案：
- `index.html`
- `pages/post.html`
- `pages/wall.html`
- 新增共用 validator（可選）

SQL（新增 migration）：
- `docs/sql/2026-03-04-rate-limit.sql`
- 內容包含：
1. 伺服端節流策略（可用 table + function，或 RPC 內檢查）。
2. 內容長度 DB check constraint（標題、內文、留言）。

DoD：
1. 連續快速提交會被擋。
2. 空白文與超長文被拒。
3. 前端提示不是只有 console log。

測試步驟：
1. 10 秒內連點送出多次，確認被限流。
2. 送空白與超長內容，確認失敗提示可讀。

---

## Ticket 07：管理後台補齊會員內容治理

目標：
1. 後台不只審投稿，還能處理留言與牆內容。
2. 所有管理動作寫入 `moderation_audit_log`。
3. 角色權限邊界清楚（member / moderator / admin / superadmin）。

修改檔案：
- `pages/admin.html`
- `docs/sql/2026-02-28-membership-v1.sql`（或新增 patch migration）
- `docs/sql/2026-03-01-member-practice-bridge.sql`（牆內容治理）

SQL（新增 migration）：
- `docs/sql/2026-03-04-moderation-extensions.sql`
- 內容包含：
1. 留言與牆內容狀態欄位（如 `visible/hidden/rejected`）。
2. 管理員 update policy。

DoD：
1. 可在後台檢視並下架違規留言/牆內容。
2. 稽核日誌完整記錄誰在何時做了什麼。
3. 一般會員無法調用管理接口。

測試步驟：
1. 建立測試違規留言與牆內容，後台下架。
2. 前台確認內容不可見。
3. 查 `moderation_audit_log` 記錄完整。

---

## 建議執行順序
1. Ticket 01
2. Ticket 02
3. Ticket 03
4. Ticket 04
5. Ticket 05
6. Ticket 06
7. Ticket 07

## 里程碑判定（會員系統「做完」標準）
1. 新會員登入後 30 秒內可完成：登入 -> 投稿 -> 留言 -> 任務同步 -> 會員中心查看。
2. 所有會員產生的內容都有可追蹤的 `user_id/member_id`（匿名例外）。
3. 主要流程無 RLS 錯配與計數錯亂。
4. 管理後台可處理投稿、留言、牆內容三類治理。
