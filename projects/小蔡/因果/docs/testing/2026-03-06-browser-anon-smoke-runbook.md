# 2026-03-06 Browser Anon Smoke Runbook

目的：用真實瀏覽器驗證未登入訪客在前台的核心門檻沒有退化。

## 腳本
- [e2e/anon-browser-smoke.spec.mjs](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/e2e/anon-browser-smoke.spec.mjs)
- [playwright.config.mjs](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/playwright.config.mjs)

## 前置條件
- [causelaw-config.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-config.js) 已存在，並填入：
  - `CAUSELAW_SUPABASE_URL`
  - `CAUSELAW_SUPABASE_ANON_KEY`
  - `CAUSELAW_DB_SCHEMA`
- 本機可執行 `npx playwright`

## 本機執行
```bash
npx playwright test e2e/anon-browser-smoke.spec.mjs --project=chromium
```

## 驗證內容
- 首頁未登入不可投稿
- 任務中心未登入提示
- 懺悔牆未登入不可同步雲端
- 文章頁未登入不可留言

## GitHub Actions
- workflow： [.github/workflows/browser-anon-smoke.yml](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/.github/workflows/browser-anon-smoke.yml)
- 觸發方式：`Actions -> Browser Anon Smoke -> Run workflow`
- 需要 secrets：
  - `CAUSELAW_SUPABASE_URL`
  - `CAUSELAW_SUPABASE_ANON_KEY`

## 注意
- 文章頁會優先抓 live `approved` 文章；若當下沒有，測試會用 mock `supabase` 來源物件驗證留言登入門檻
- 這組 smoke 不寫入後端資料
