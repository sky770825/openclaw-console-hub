# 2026-03-06 Deploy Checklist

上線前至少跑完這四件事，否則不要把 shared DB 與前台互動當成已驗證。

## 1. 套用資料庫 hotfix
- [2026-03-06-members-role-hardening-hotfix.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-06-members-role-hardening-hotfix.sql)
- [2026-03-06-engagement-guardrails-hotfix.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-06-engagement-guardrails-hotfix.sql)
- [2026-03-06-schema-privileges-hardening-hotfix.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-06-schema-privileges-hardening-hotfix.sql)
- 若 shared DB 曾被寫入 `pgrst.db_schemas`，確認 Dashboard 後再決定是否執行 [2026-03-06-pgrst-db-schemas-reset-optional.sql](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/sql/2026-03-06-pgrst-db-schemas-reset-optional.sql)

## 2. 確認 API 設定
- Supabase Dashboard `API Settings -> Exposed schemas` 已包含 `causelaw_yinguo_v1`
- [causelaw-config.js](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/causelaw-config.js) 已填入正確 public URL / anon key

## 3. 跑 API smoke
- 本機或 GitHub Actions 執行 [scripts/supabase_live_smoke.py](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/scripts/supabase_live_smoke.py)
- runbook： [2026-03-06-live-smoke-runbook.md](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/testing/2026-03-06-live-smoke-runbook.md)

## 4. 跑瀏覽器 smoke
- 匿名訪客路徑： [2026-03-06-browser-anon-smoke-runbook.md](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/testing/2026-03-06-browser-anon-smoke-runbook.md)
- 會員與後台路徑： [2026-03-07-browser-auth-admin-smoke-runbook.md](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/testing/2026-03-07-browser-auth-admin-smoke-runbook.md)

## 5. GitHub Actions secrets
- `CAUSELAW_SUPABASE_URL`
- `CAUSELAW_SUPABASE_ANON_KEY`
- `CAUSELAW_SUPABASE_SERVICE_ROLE_KEY`

## 6. 手動抽驗
- 依 [2026-03-06-access-smoke-checklist.md](/Users/sky770825/.openclaw/workspace/projects/達爾/因果/docs/testing/2026-03-06-access-smoke-checklist.md) 至少抽驗 `anon`、`member`、`admin` 各一輪
