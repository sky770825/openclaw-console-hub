# 後台管理說明（Supabase 角色門禁版）

## 後台網址

- 頁面：`pages/admin.html`
- 完整路徑：`https://你的網域/pages/admin.html`

請勿在公開導覽放後台連結。

## 登入與權限

- 登入方式：Supabase Email OTP（Magic Link）
- 允許角色：`moderator` / `admin` / `superadmin`
- 角色來源：`public.causelaw_members.role`

若角色不符，畫面會顯示「權限不足」並拒絕進入後台。

## 審核功能

- 待審資料來源：`public.causelaw_posts`（`status = 'pending'`）
- 通過：更新為 `approved`，並寫入 `moderation_reason`
- 拒絕：更新為 `rejected`，並寫入 `moderation_reason`
- 稽核記錄：寫入 `public.moderation_audit_log`

## 上線前檢查

1. [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js) 已填入 URL / anon key
2. [docs/sql/2026-02-28-membership-v1.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-02-28-membership-v1.sql) 已執行
3. [docs/sql/2026-03-01-bootstrap-admin-members.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-01-bootstrap-admin-members.sql) 已建立至少一個管理員角色
