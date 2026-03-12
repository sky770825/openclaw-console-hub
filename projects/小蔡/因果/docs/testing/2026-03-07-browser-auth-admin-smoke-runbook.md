# 2026-03-07 Browser Auth/Admin Smoke Runbook

目的：用真實瀏覽器驗證會員登入、投稿、留言/按讚、祈福牆同步、任務完成，以及 admin 後台審核與 audit log 路徑。

## 腳本
- [e2e/auth-admin-browser-smoke.spec.mjs](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/e2e/auth-admin-browser-smoke.spec.mjs)
- [e2e/helpers/causelaw-supabase.mjs](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/e2e/helpers/causelaw-supabase.mjs)
- [playwright.config.mjs](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/playwright.config.mjs)

## 需要的環境變數
- `CAUSELAW_SUPABASE_SERVICE_ROLE_KEY`
- `CAUSELAW_SUPABASE_URL`：可省略，預設從 [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js) 讀取
- `CAUSELAW_SUPABASE_ANON_KEY`：可省略，預設從 [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js) 讀取
- `CAUSELAW_DB_SCHEMA`：可省略，預設 `causelaw_yinguo_v1`
- `CAUSELAW_SMOKE_PASSWORD`：可省略，預設 `SmokeTest!20260306`
- `CAUSELAW_SMOKE_EMAIL_DOMAIN`：可省略，預設 `mailinator.com`

## 本機執行
```bash
export CAUSELAW_SUPABASE_SERVICE_ROLE_KEY='...'
npx playwright test e2e/auth-admin-browser-smoke.spec.mjs --project=chromium
```

## 驗證內容
- 建立 confirmed 測試會員
- 會員登入首頁共用彈窗
- 會員投稿成功
- 會員可在已核准文章留言並按讚
- 會員可同步祈福牆內容到雲端
- 會員可完成 seeded 任務，並寫回 `tasks`
- `member` 角色不得進入 `pages/admin.html`
- 提升成 `admin` 後，可在後台通過與拒絕待審投稿
- `moderation_audit_log` 寫入成功
- 預設清理測試會員、投稿、牆面資料、任務與 audit log

## GitHub Actions
- workflow： [.github/workflows/browser-auth-admin-smoke.yml](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/.github/workflows/browser-auth-admin-smoke.yml)
- 觸發方式：`Actions -> Browser Auth Admin Smoke -> Run workflow`
- 需要 secrets：
  - `CAUSELAW_SUPABASE_URL`
  - `CAUSELAW_SUPABASE_ANON_KEY`
  - `CAUSELAW_SUPABASE_SERVICE_ROLE_KEY`

## 注意
- 這組 smoke 會實際建立暫時會員、已核准/待審投稿、牆面資料與任務，再自動清理
- 若 `service_role` 沒提供，測試會自動 skip，不會誤報 fail
