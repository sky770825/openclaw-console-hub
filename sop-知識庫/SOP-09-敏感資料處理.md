# SOP-9: 敏感資料處理

## metadata

```yaml
id: sop-09
name: 敏感資料處理
category: 安全
tags: [敏感資料, API key, token, password, 密碼, credentials, .env, 安全, 洩漏]
version: 2.0
created: 2026-02-16
trigger: 碰到 API keys、tokens、passwords、credentials、.env 檔案
priority: P0
燈號: 🟢 讀取 .env / 🟡 新增 .env 變數 / 🔴 修改現有 key
```

---

## 目的

敏感資料洩漏 = 帳號被盜 = 損失。一個 API key 外洩就可能被人刷爆額度。

---

## 敏感資料辨識

| 類型 | 特徵 | 範例 |
|------|------|------|
| API Key | `sk-`、`api-`、`key-` 開頭 | `sk-ant-api03-...` |
| Token | `token`、`bearer`、`jwt` | `eyJhbGci...` |
| Password | `password`、`passwd`、`pwd` | `p@ssw0rd123` |
| Secret | `secret`、`private` | `my-secret-key` |
| Connection String | `postgres://`、`mongodb://` | `postgres://user:pass@host` |

---

## 正確存放位置

| ✅ 可以放 | ❌ 不可以放 |
|-----------|-----------|
| `.env` 檔案 | `.md` 文件 |
| `credentials/` 目錄 | git commit 紀錄 |
| Docker secrets | Telegram 訊息 |
| 環境變數 | 知識庫文件 |
| | 任務板描述 |
| | 日誌檔案 |

---

## 操作分級

| 操作 | 燈號 | 規則 |
|------|------|------|
| 讀取 .env | 🟢 | 直接做 |
| 在回報中引用 key 名稱 | 🟢 | 只提名稱不提值（例如 `KIMI_API_KEY` 而非實際 key） |
| 新增 .env 變數 | 🟡 | 先跟老蔡說 |
| 修改現有 key | 🔴 | 必須老蔡批准 |
| 在 commit 中包含敏感資料 | 🔴🔴 | 絕對禁止 |

---

## 洩漏處理流程

### 發現敏感資料外洩時：

1. 🔴 **立即回報老蔡**
2. **不要自行 rotate key**（你不知道哪些服務在用）
3. 記錄：
   - 在哪裡發現的
   - 什麼類型的敏感資料
   - 是否已經被 commit 到 git

```
🔴 敏感資料洩漏

發現位置：{檔案路徑:行號}
類型：{API Key / Token / Password}
是否已 commit：{是/否}
建議：立即 rotate key

等你處理。
```

---

## Git Commit 前檢查

每次 commit 前必須確認：

```bash
# 檢查 staged 檔案有沒有敏感資料
git diff --cached --name-only | xargs grep -l "sk-\|api_key\|password\|token\|secret" 2>/dev/null
```

**以下檔案絕對不可以 commit：**
- `.env`、`.env.local`、`.env.production`
- `*.key`、`*.pem`、`*.cert`
- `credentials.json`、`secrets.yaml`
- 任何包含明文 API key 的檔案

---

## 回報格式（正常操作）

```
🔐 敏感資料操作

操作：{讀取/新增/修改}
檔案：{.env 路徑}
變數名稱：{KEY_NAME}（不含值）
狀態：{完成/需要批准}
```

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 不小心在回報中貼了 key | 立即告知老蔡，刪除該訊息 |
| 發現 git history 有敏感資料 | 🔴 回報老蔡，不要自行 git filter-branch |
| .env 被刪除 | 從備份恢復，回報老蔡 |
| Key 過期 | 回報老蔡，走 10-換API金鑰 流程 |

---

## 絕對禁止

- ❌ 在 Telegram / 回報 / log 中貼出 API key 值
- ❌ 自行 rotate key（不知道影響範圍）
- ❌ 把 .env 加入 git
- ❌ 在知識庫文件中寫入連線字串
- ❌ Hardcode key 在程式碼中
