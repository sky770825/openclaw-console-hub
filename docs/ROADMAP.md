# OpenClaw 整體規劃與補強清單

本文整理目前完成度與後續可補強項目，方便排優先級。

---

## 一、目前已完成

| 項目 | 說明 |
|------|------|
| **中控台 UI** | 儀表板、任務看板、任務列表、執行紀錄、Run 詳情、日誌、警報、設定（含中文） |
| **名詞與型別** | Task / Run / Log / Alert 定義、`src/types/`、任務卡 6 欄、Kanban 六欄 |
| **Mock / 接後端** | 無 `VITE_API_BASE_URL` 用 localStorage；有則打 REST API（`apiClient`） |
| **本機後端** | `server/` 實作 API，立即執行／重跑模擬約 1.5s 完成 |
| **執行回饋** | 立即執行／重跑後輪詢 Run 狀態，toast「已加入執行佇列」→「執行完成」 |
| **Alerts 接後端** | `getAlerts`、`updateAlertStatus` 已改走 `api`，接後端時警報來自 API |
| **Runs Re-run** | 執行紀錄詳情「重新執行」改為 `api.rerun(runId)`，並有輪詢與完成 toast |
| **部署** | GitHub、Vercel、GitHub Actions 自動部署、`deploy:ci` 腳本 |
| **文件** | OPENCLAW-CONCEPT、TASK-TEMPLATE、API-INTEGRATION、DEPLOY |

---

## 二、建議補強（依優先級）

### 高（接後端後行為一致）

- [ ] **createTask 接後端**  
  目前「新增任務」仍只寫 localStorage（`createTask` 來自 `tasks.ts`）。  
  若後端要支援：後端加 `POST /api/tasks`，`apiClient` 與 api 切換層加 `createTask`，表單改為呼叫 api。

### 中（體驗與可維護性）

- [ ] **Logs API**  
  文件有 Log 名詞，目前 Logs 頁為 mock。若後端要集中日誌：後端實作 `GET /api/logs`（可選 query：runId、level、時間），中控台改為呼叫 API。

- [ ] **後端持久化**  
  `server/` 目前 in-memory，重啟資料清空。可改為 JSON 檔或簡易 DB（如 SQLite），或至少在 README 註明「僅示範用、重啟清空」。

- [ ] **執行紀錄即時更新**  
  Runs 列表目前進入頁面時載入一次；若希望「執行中」的 Run 自動更新狀態，可對列表內 running/queued 的 Run 做短輪詢或將來改 WebSocket。

### 低（選做）

- [ ] **錯誤邊界**  
  前端加 React Error Boundary，API 或渲染錯誤時顯示友善頁面而非白屏。

- [ ] **單元／E2E 測試**  
  對關鍵流程（例如 runNow → 輪詢 → 完成）寫測試，避免重構時踩壞。

- [ ] **Settings 與後端**  
  Settings 目前為 UI + mock 儲存；若未來有「系統設定 API」，再對接即可。

---

## 三、與團隊對齊後再決定的項目

- **認證／權限**：目前無登入；若需要，可加 Auth 與 API token，後端驗證。
- **真實執行引擎**：目前後端為「模擬執行」；真實跑腳本／排程需由你們的執行引擎實作，並維持相同 API 契約（見 API-INTEGRATION.md）。

---

## 四、小結

- **對外展示與對齊**：用現有 demo + 文件即可。  
- **接上真實後端**：設好 `VITE_API_BASE_URL`，Tasks / Runs / Alerts 已走 API；補上 `createTask` 與 Logs 依需求再做。  
- **長期**：後端持久化、日誌 API、錯誤邊界與測試可依資源逐步補強。
