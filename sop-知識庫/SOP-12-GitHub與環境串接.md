# SOP-12: GitHub 與環境串接（GitHub / Supabase / Vercel）

## metadata

```yaml
id: sop-12
name: GitHub 與環境串接
category: 運維
tags: [github, git, supabase, vercel, 部署, deploy, CI/CD, 環境, CLI]
version: 1.0
created: 2026-02-16
trigger: 要 push 程式碼、要部署、要連 Supabase、要上 Vercel
priority: P1
燈號: 🟡 push / deploy / 🔴 改 production 設定
```

---

## 一、GitHub

### 帳號

| 帳號 | 用途 | 權限 |
|------|------|------|
| `andy825lay-tech` | workspace repo（主帳號，Active） | delete_repo, gist, read:org, repo |
| `sky770825` | 任務面版 console-hub | gist, read:org, repo, workflow |
| `chu20170103-bit` | 備用 | gist, read:org, repo, workflow |

### 常用 Repo

| Repo | URL | 用途 |
|------|-----|------|
| workspace | `https://github.com/andy825lay-tech/openclaw-workspace.git` | 小蔡的工作區 |
| console-hub | `git@github.com:sky770825/openclaw-console-hub.git` | 任務面版前後端 |

### 登入方式

```bash
# 檢查目前登入狀態
gh auth status

# 切換帳號
gh auth switch --user andy825lay-tech
gh auth switch --user sky770825

# 重新登入（token 過期時）
gh auth login
```

### Git 設定

```
# ~/.gitconfig
[user]
    name = 濬瑒
    email = sky19880825@gmail.com
[credential "https://github.com"]
    helper = !/opt/homebrew/bin/gh auth git-credential
```

### 常用操作

```bash
# workspace repo
cd ~/.openclaw/workspace
git add -A && git commit -m "描述"
git push origin main

# console-hub repo
cd ~/openclaw任務面版設計
git add -A && git commit -m "描述"
git push origin review-big-changes  # 目前分支
```

---

## 二、Supabase

### 專案資訊

| 項目 | 值 |
|------|-----|
| Project ID | `vbejswywswaeyfasnwjq` |
| URL | `https://vbejswywswaeyfasnwjq.supabase.co` |
| Dashboard | `https://supabase.com/dashboard/project/vbejswywswaeyfasnwjq` |

### 金鑰位置

| 金鑰 | 位置 | 用途 |
|------|------|------|
| Service Role Key | `~/openclaw任務面版設計/.env` → `SUPABASE_SERVICE_ROLE_KEY` | 後端完整存取 |
| Anon Key | `~/openclaw任務面版設計/server/.env` → `SUPABASE_ANON_KEY` | 前端受限存取 |

### 登入 Supabase Dashboard

1. 瀏覽器開 `https://supabase.com/dashboard`
2. 用 GitHub 帳號登入（sky19880825@gmail.com）
3. 選擇專案 `vbejswywswaeyfasnwjq`

### CLI 串接

```bash
# 安裝 Supabase CLI
brew install supabase/tap/supabase

# 登入
supabase login

# 連接到專案
cd ~/openclaw任務面版設計
supabase link --project-ref vbejswywswaeyfasnwjq

# 查看資料表
supabase db dump --schema public

# 執行 migration
supabase db push
```

### 資料表

| 資料表 | 用途 |
|--------|------|
| `openclaw_tasks` | 任務板（標題、進度、子任務） |
| `openclaw_reviews` | 審核中心（審批流程） |
| `openclaw_automations` | 自動化流程（cron、chain、health） |
| `openclaw_evolution_log` | 演化歷史 |
| `openclaw_plugins` | 插件市場 |
| `openclaw_audit_logs` | 稽核日誌 |
| `openclaw_ui_actions` | UI 動作映射 |

### API 測試

```bash
# 測試 Supabase 連線
curl -s "https://vbejswywswaeyfasnwjq.supabase.co/rest/v1/openclaw_tasks?select=id&limit=1" \
  -H "apikey: $(grep SUPABASE_ANON_KEY ~/openclaw任務面版設計/server/.env | cut -d= -f2)" \
  -H "Authorization: Bearer $(grep SUPABASE_ANON_KEY ~/openclaw任務面版設計/server/.env | cut -d= -f2)"
```

### Migration SQL 位置

```
~/openclaw任務面版設計/docs/supabase-openclaw-migration.sql
```

---

## 三、Vercel

### 部署方式

**方式 1: GitHub Actions 自動部署**

Push 到 `main` 分支 → 自動觸發 `deploy-production.yml` → 部署到 Vercel

```bash
# 從 review-big-changes merge 到 main
git checkout main
git merge review-big-changes
git push origin main  # 🔴 需老蔡批准
```

**方式 2: CLI 手動部署**

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# Preview 部署
cd ~/openclaw任務面版設計
vercel

# Production 部署（🔴 需老蔡批准）
vercel --prod
```

**方式 3: npm script**

```bash
cd ~/openclaw任務面版設計
npm run deploy:preview   # Preview
npm run deploy            # Production 🔴
```

### GitHub Actions Secrets

部署需要在 GitHub repo settings 設定：

| Secret 名稱 | 說明 | 設定位置 |
|-------------|------|---------|
| `VERCEL_ORG_ID` | Vercel 組織 ID | GitHub → Settings → Secrets |
| `VERCEL_PROJECT_ID` | Vercel 專案 ID | GitHub → Settings → Secrets |
| `VERCEL_TOKEN` | Vercel API Token | GitHub → Settings → Secrets |

### CI/CD Workflow 檔案

```
~/openclaw任務面版設計/.github/workflows/
  ├── deploy-production.yml   # main 分支 → production
  ├── deploy-preview.yml      # PR → preview
  ├── deploy-github-pages.yml # GitHub Pages
  └── ci.yml                  # 自動測試
```

### 備用：Railway 部署

```bash
# Railway 也有設定（備用方案）
# 設定檔：~/openclaw任務面版設計/railway.json
# Server Dockerfile：~/openclaw任務面版設計/server/Dockerfile
```

---

## 環境變數總覽

| 位置 | 包含什麼 |
|------|---------|
| `~/openclaw任務面版設計/.env` | Supabase URL + Service Role Key, Telegram, AI keys |
| `~/openclaw任務面版設計/.env.example` | 模板（不含真實值） |
| `~/openclaw任務面版設計/server/.env` | Supabase Anon Key, PORT, 控制 Bot Token |
| `~/.openclaw/.env` | Gemini, OpenAI, Kimi, Anthropic API Keys |
| `~/.openclaw/secrets/n8n-production.env` | n8n 帳密, Postgres, 加密金鑰 |
| `~/.openclaw/secrets/n8n-telegram.env` | Telegram Bot Token + Chat ID |

---

## 回報格式

```
🔗 環境串接狀態

GitHub：{🟢 已登入 帳號名 / 🔴 未登入}
Supabase：{🟢 連線正常 / 🔴 Key 過期}
Vercel：{🟢 已設定 / 🔴 未初始化}
最近部署：{日期} — {preview/production}
```

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| `gh auth` 過期 | `gh auth login` 重新登入 |
| Supabase key 無效 | 回報老蔡，去 Dashboard 重新產 key |
| Vercel 部署失敗 | 看 GitHub Actions log，回報錯誤 |
| git push 被拒 | 檢查分支保護規則，可能需要 PR |
| 環境變數遺失 | 對照 `.env.example` 補齊 |
