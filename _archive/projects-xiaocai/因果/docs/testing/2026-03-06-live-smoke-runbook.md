# 2026-03-06 Live Smoke Runbook

目的：把線上 Supabase 權限與互動 smoke test 收斂成一支可重跑腳本，避免每次手工組 `curl`。

## 腳本
- [scripts/supabase_live_smoke.py](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/scripts/supabase_live_smoke.py)

## 需要的環境變數
- `CAUSELAW_SUPABASE_SERVICE_ROLE_KEY`
- `CAUSELAW_SUPABASE_URL`：可省略，預設從 [causelaw-config.js](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/causelaw-config.js) 讀取
- `CAUSELAW_SUPABASE_ANON_KEY`：可省略，預設從 [causelaw-config.js](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/causelaw-config.js) 讀取
- `CAUSELAW_DB_SCHEMA`：可省略，預設 `causelaw_yinguo_v1`
- `CAUSELAW_SMOKE_PASSWORD`：可省略，預設 `SmokeTest!20260306`
- `CAUSELAW_SMOKE_EMAIL_DOMAIN`：可省略，預設 `mailinator.com`

## 執行方式
```bash
export CAUSELAW_SUPABASE_SERVICE_ROLE_KEY='...'
python3 scripts/supabase_live_smoke.py
```

若你也想覆寫 public 設定：
```bash
export CAUSELAW_SUPABASE_URL='https://<project-ref>.supabase.co'
export CAUSELAW_SUPABASE_ANON_KEY='sb_publishable_...'
export CAUSELAW_SUPABASE_SERVICE_ROLE_KEY='...'
python3 scripts/supabase_live_smoke.py
```

## 驗證內容
- 建立一個 confirmed 測試會員，並用真實 Auth password flow 登入
- `ensure_member_profile`
- `anon` 不能讀 `tasks`
- 會員不能 direct insert `posts`
- 會員不能自我升權
- 會員投稿 3 篇成功，第 4 篇被擋
- 會員可讀自己的 `pending`，`anon` 不能讀
- 會員不能自行把文章改成 `approved`
- 將該會員暫時升成 `admin` 後，可列出待審、通過、拒絕、寫入 `moderation_audit_log`
- `anon` 只能讀 `approved` 文章
- 降回 `member` 後，不能讀 `moderation_audit_log`
- 留言 20 則成功，第 21 則被擋
- 留言按讚去重
- 祈福/懺悔牆重複內容與每日上限
- 會員 `tasks` 讀寫
- 會員 `daily_checkin` upsert

## 清理策略
- 預設會刪除測試建立的：
  - `auth.users`
  - `members`
  - `posts`
  - `wall_entries`
  - `tasks`
  - `daily_checkin`
  - `moderation_audit_log`
- 若要保留現場資料供除錯：
```bash
python3 scripts/supabase_live_smoke.py --keep-data
```

## GitHub Actions
- workflow 檔案： [.github/workflows/supabase-live-smoke.yml](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/.github/workflows/supabase-live-smoke.yml)
- 觸發方式：`Actions -> Supabase Live Smoke -> Run workflow`
- 需要先在 repo secrets 設定：
  - `CAUSELAW_SUPABASE_URL`
  - `CAUSELAW_SUPABASE_ANON_KEY`
  - `CAUSELAW_SUPABASE_SERVICE_ROLE_KEY`
- workflow 預設會清掉 smoke 資料；若要保留現場，執行時把 `keep_data=true`

## 注意
- 腳本會直接打 live 專案，請只在你確認的環境使用
- 不要把 `service_role` key 寫進 repo
- 若腳本失敗，先看輸出的 `error` 與 `results`，再回頭對照 [2026-03-06-access-smoke-checklist.md](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/testing/2026-03-06-access-smoke-checklist.md)
