# 因果真相專案 — 資料與可用資源

> 專案內資料 + 工作區（openclaw）可用的資料庫與 API 索引

---

## 一、專案內資料（因果真相旗艦專案）

| 路徑 | 內容 | 可用於 |
|------|------|--------|
| `data/deities.json` | 神明大數據（5 尊，已對照維基） | 神明殿堂頁、全站名稱一致、SEO |
| `SCRIPTURE-AND-NAMES-VERIFICATION.md` | 經文與神明名稱校對紀錄 | 維護、大數據對接 |
| `DEITIES-DATA.md` | 神明資料說明與維基對照表 | 擴充神明、欄位說明 |
| `IMAGE-PROMPTS.md` | 全站圖片生成 prompt 與路徑 | 各區配圖 |
| `WEBSITE-REVIEW.md` | 全站檢視與補強建議 | 後續優化 |
| **`docs/MERIT-SYSTEM-EXTENSION.md`** | **每日功過格延伸：善惡值、福報／扣分、會員、歸宿對照** | 功過格擴充、善惡值與六道／地獄對應、分階段實作 |
| **`data/scriptures.json`** | **佛教・道教經咒分類與校對依據** | 經咒・禪樂頁、大悲咒／心經／往生咒／道教八大神咒等權威來源 |

目前**沒有**資料庫連線（無 Supabase/API 直連）；投稿表單為前端 only，功過格為 localStorage。

---

## 二、工作區可用的「資料庫」與 API（openclaw）

以下在 **workspace 根目錄**（cookbook、SYSTEM-KNOWLEDGE 等），因果專案若要接後端或任務板可參考。

### 1. Cookbook（查資料用圖書館）

| 檔案 | 內容 |
|------|------|
| `cookbook/README.md` | 目錄 |
| `cookbook/02-資料庫.md` | **Supabase 15 張表** schema、欄位、查詢範例、建任務 curl |
| `cookbook/01-API-端點.md` | API 路由、參數、回傳格式 |
| `cookbook/04-自動化執行.md` | auto-executor、任務排程 |
| `cookbook/08-協作與通訊.md` | Telegram、n8n、達爾協作 |
| `cookbook/11-任務狀態機.md` | 任務狀態、Auto-Executor 決策樹 |

### 2. 資料庫表（Supabase）

| 表名 | 用途 |
|------|------|
| `openclaw_tasks` | 任務板（建任務、查狀態、更新結果） |
| `openclaw_runs` | 執行記錄 |
| `openclaw_memory` | AI 記憶庫 |
| `openclaw_reviews` | 審核/想法 |
| 其他 | 見 `cookbook/02-資料庫.md` |

### 3. 常用 API（Server port 3011）

| 端點 | 用途 |
|------|------|
| `GET /api/health` | 健康檢查 |
| `GET /api/openclaw/tasks` | 查任務列表 |
| `POST /api/openclaw/tasks` | 建新任務（需 Bearer Token） |
| `PATCH /api/openclaw/tasks/:id` | 更新任務狀態／結果 |

建任務範例見 `cookbook/02-資料庫.md` 或 AGENTS.md 的「建任務 API」。

### 4. 其他索引

| 檔案 | 內容 |
|------|------|
| `SYSTEM-KNOWLEDGE.md` | OpenClaw 系統索引（API、後端、前端、9 甲板） |
| `SYSTEM-RESOURCES.md` | Supabase、n8n、Server API 總覽 |

---

## 三、因果專案「可接」的可用資源

若未來要讓因果真相網站：

- **存投稿、功過格、或留言** → 可接 Supabase（需在 02-資料庫 建表或沿用 openclaw_* 表）。
- **上稿到任務板、讓 auto-executor 做** → 用 `POST /api/openclaw/tasks`（見 cookbook/02-資料庫）。
- **發通知給主人** → Telegram / n8n（見 cookbook/08）。

目前專案**沒有新增** Supabase 或 OpenClaw API 的依賴；所有「可用的東西」都在工作區的 cookbook 與 SYSTEM-*，需要時再查即可。
