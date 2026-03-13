# 自動化甲板現況 — 2026-02-27

## 一、入口與模組

- **路由**：`/center/automation`（任務板 UI）
- **側欄**：AppSidebar → 「自動化甲板」、icon Workflow
- **定義**：`hubCenters.ts` — 自動化甲板 = n8n 工作流、排程引擎、自動巡邏、控制腳本

| 模組 | 路由 | 說明 |
|------|------|------|
| n8n 工作流 | /center/automation/n8n | 工作流列表與觸發 |
| 自動執行器 | /center/automation/executor | 自動任務派發 + 批次執行 |
| 自動巡邏 | /center/automation/patrol | 健康監控（openclaw-auto-patrol）|
| 控制腳本 | /center/automation/scripts | 安全子程序 + 逾時處理 |
| 備份還原 | /center/automation/backup | 專案備份 + 記憶體同步 |
| Telegram 控制 | /center/automation/telegram | 審核/狀態/停止指令 |

---

## 二、後端資料（API 實際狀態）

### 1. 排程自動化（Supabase openclaw_automations）

| ID | 名稱 | Cron | 啟用 | 健康度 | 執行次數 | 鏈 |
|----|------|------|------|--------|----------|-----|
| a1 | 安全掃描 | 0 */6 * * * | ✅ | 94% | 128 | 程式碼分析 → 漏洞掃描 → 靜態檢測 |
| a2 | 套件更新 | 0 3 * * 1 | ✅ | 91% | 52 | 自動升版 → 單元測試 → 金絲雀部署 |
| a3 | 效能基線 | 30 2 * * * | ❌ | 88% | 77 | Lighthouse → 壓力測試 → 出報告 |
| a4 | 發行紀錄 | 0 18 * * 5 | ✅ | 96% | 39 | 蒐集 PR → AI 摘要 → 發佈 |

- **lastRun** 在 API 回傳為空字串，無法從目前資料看出上次執行時間。
- 共 **4 筆**，**3 筆啟用**、1 筆（效能基線）關閉。

### 2. 整體健康（/api/openclaw/board-health）

- **Supabase**：✅ 已連線  
- **n8n**：✅ 已設定  
- **任務**：91  
- **審核**：4  
- **自動化**：4  
- **執行紀錄 (runs)**：543  
- **告警**：0  

### 3. Auto-Executor（自動執行器）

- **狀態**：✅ **運行中**  
- **模式**：dispatch（派工模式）  
- **輪詢間隔**：10 秒  
- **每分鐘上限**：1 任務  
- **最後輪詢**：2026-02-27T01:51:46  
- **最後執行任務**：t1772156966670（[測試] Gemini result 驗證）  
- **最後執行時間**：2026-02-27T01:49:45  
- **今日已執行**：9 次  
- **待主人審核**：3 筆（critical 風險）  
  - [AI甲板] 新增 Benchmark 模組  
  - [AI甲板] 新增 Chat 模組  
  - [自我進化] Gemini API 直連測試 — gemini-test.py  

---

## 三、UI 與資料來源

- **AutomationDeck.tsx** 內 **n8n 工作流** 目前為**前端假資料**（7 筆寫死），未接 `/api/openclaw/board-config` 的 n8n 列表。
- **Executor 頁** 的「啟動/停止」會打 `POST /api/openclaw/auto-executor/start|stop`，但佇列與日誌為假資料，未接 Auto-Executor 的即時狀態或 runs。

---

## 四、小結與建議

| 項目 | 狀態 |
|------|------|
| 排程自動化（4 筆） | ✅ 3 啟用、1 關閉；health 88–96% |
| Auto-Executor | ✅ 運行中，今日已執行 9 次，3 筆待審 |
| n8n 整合 | ✅ 後端已設定，board-health 顯示 n8n 已配置 |
| 自動化甲板 UI | ⚠️ n8n / 執行器頁多為假資料，未完全接真實 API |

**建議**：  
1. 若要看到**真實 n8n 工作流**，可讓 AutomationDeck 的 n8n 模組改呼叫 `GET /api/openclaw/board-config` 的 n8n 列表並顯示。  
2. 若要看到**真實執行器佇列與日誌**，可讓 executor 子頁接 `GET /api/openclaw/auto-executor/status` 的 `recentExecutions` 與 `pendingReviews`。  
3. 排程自動化的 **lastRun** 若需顯示，需在寫入/更新 run 時一併更新 automations 的 last_run 欄位或由 API 彙算。

---

*報告時間：2026-02-27*
