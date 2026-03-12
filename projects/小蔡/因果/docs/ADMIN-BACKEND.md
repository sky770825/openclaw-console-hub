# 後台管理說明（Shared DB / Supabase 角色門禁版）

## 後台網址

- 頁面：`pages/admin.html`
- 完整路徑：`https://你的網域/pages/admin.html`

請勿在公開導覽放後台連結。

## 登入與權限

- 前台共用登入：首頁會員彈窗支援帳號密碼登入 / 註冊 / magic link
- 後台頁面：登入後仍需重新檢查角色
- 允許角色：`moderator` / `admin` / `superadmin`
- 角色來源：`causelaw_yinguo_v1.members.role`
- 帳號狀態來源：`causelaw_yinguo_v1.members.status`

若角色不符，畫面會顯示「權限不足：目前角色為 member」並拒絕進入後台。

## 審核功能

- 待審資料來源：`causelaw_yinguo_v1.posts`（`status = 'pending'`）
- 通過：更新為 `approved`，並寫入 `moderation_reason`
- 拒絕：更新為 `rejected`，並寫入 `moderation_reason`
- 稽核記錄：寫入 `causelaw_yinguo_v1.moderation_audit_log`

## 需要的檔案

- public config： [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js)
- schema migration： [2026-03-04-shared-db-isolation-v1.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-04-shared-db-isolation-v1.sql)
- hotfix：
  - [2026-03-06-members-role-hardening-hotfix.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-06-members-role-hardening-hotfix.sql)
  - [2026-03-06-engagement-guardrails-hotfix.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-06-engagement-guardrails-hotfix.sql)
  - [2026-03-06-schema-privileges-hardening-hotfix.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-06-schema-privileges-hardening-hotfix.sql)

## 上線前檢查

1. [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js) 已填入 URL / anon key
2. Supabase Dashboard `API Settings -> Exposed schemas` 已包含 `causelaw_yinguo_v1`
3. 已執行 [2026-03-06-live-smoke-runbook.md](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/testing/2026-03-06-live-smoke-runbook.md)
4. 已執行匿名瀏覽器 smoke： [2026-03-06-browser-anon-smoke-runbook.md](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/testing/2026-03-06-browser-anon-smoke-runbook.md)
5. 已執行會員/後台瀏覽器 smoke： [2026-03-07-browser-auth-admin-smoke-runbook.md](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/testing/2026-03-07-browser-auth-admin-smoke-runbook.md)
