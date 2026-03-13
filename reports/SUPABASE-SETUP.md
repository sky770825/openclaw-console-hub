# Supabase 連接與後台門禁設定（最新版）

> 適用版本：2026-03-01（admin 後台已改為 OTP + 角色門禁）

## 1. 執行主資料庫腳本

在 Supabase SQL Editor 依序執行：

1. [docs/sql/2026-02-28-membership-v1.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-02-28-membership-v1.sql)
2. （可選）智慧修行助手 schema：
   - [docs/sql/2026-02-28-smart-assistant-v1-isolated-schema.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-02-28-smart-assistant-v1-isolated-schema.sql)
3. （可選）祈福/懺悔牆會員橋接：
   - [docs/sql/2026-03-01-member-practice-bridge.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-01-member-practice-bridge.sql)

## 2. 前端填入 Supabase 設定

編輯 [causelaw-config.js](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/causelaw-config.js)：

```js
window.CAUSELAW_SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
window.CAUSELAW_SUPABASE_ANON_KEY = '<your-anon-key>';
```

注意：
- `anon key` 可放前端。
- `service_role key` 不可放前端。

## 3. 建立首批管理員帳號

先讓管理員信箱至少登入一次（網站會員登入或 Supabase Auth Users 手動建立），確保帳號存在 `auth.users`。

接著執行：
- [docs/sql/2026-03-01-bootstrap-admin-members.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-01-bootstrap-admin-members.sql)

把 SQL 內的示例信箱（`admin@example.com` 等）改成你的真實信箱。

## 4. 驗證後台門禁

1. 開啟 `pages/admin.html`
2. 輸入管理員信箱，點「寄送登入連結」
3. 完成信箱驗證後，回到後台按「重新檢查權限」
4. 頂部若顯示 `email · role` 且可看到待審清單，代表成功

## 5. 常見錯誤排查

- 顯示「Supabase 尚未設定」：`causelaw-config.js` 尚未填值或沒被載入
- 顯示「查無 causelaw_members 資料」：該帳號未執行 bootstrap SQL
- 顯示「權限不足」：`causelaw_members.role` 不是 `moderator/admin/superadmin`
- 待審清單載入失敗：RLS policy 或 table 欄位尚未完成 migration
