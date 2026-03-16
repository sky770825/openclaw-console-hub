# OpenClaw 中控台 — 接上真實後端

目前中控台使用 **localStorage + 種子資料**。要接上 OpenClaw 真實執行引擎，後端需提供一組 REST API，中控台改為呼叫該 API。

---

## 一、中控台怎麼切換到後端

1. **設定 API 根網址**  
   在專案根目錄建立 `.env`（或 `.env.production`），例如：
   ```env
   VITE_API_BASE_URL=https://your-openclaw-api.example.com
   ```
   不設或留空時，仍使用目前的 **localStorage（mock）**。

2. **重新 build / 重啟 dev**  
   - 本機：`npm run dev`  
   - 部署：`npm run build` 時會把 `VITE_API_BASE_URL` 打包進去。

3. **CORS**  
   若前後端不同網域，後端需允許中控台網域的 CORS。

---

## 二、後端需實作的 API 規格

以下為中控台會呼叫的介面，型別定義以 `src/types/` 為準。

### 1. Tasks（任務）

| 方法 | HTTP | 路徑 | 說明 |
|------|------|------|------|
| 列表 | GET | `/api/tasks` | 回傳 `Task[]` |
| 單筆 | GET | `/api/tasks/:id` | 回傳 `Task` |
| 更新 | PATCH | `/api/tasks/:id` | body: `Partial<Task>`，回傳 `Task` |

### 2. Runs（執行）

| 方法 | HTTP | 路徑 | 說明 |
|------|------|------|------|
| 列表 | GET | `/api/runs` | Query 可選：`?taskId=xxx`，回傳 `Run[]` |
| 單筆 | GET | `/api/runs/:id` | 回傳 `Run` |
| 立即執行 | POST | `/api/tasks/:taskId/run` | 觸發該任務執行，回傳新建立的 `Run` |
| 重跑 | POST | `/api/runs/:id/rerun` | 依該 Run 再觸發一次，回傳新 `Run` |

### 3. Alerts（警報）

| 方法 | HTTP | 路徑 | 說明 |
|------|------|------|------|
| 列表 | GET | `/api/alerts` | 回傳 `Alert[]` |
| 更新 | PATCH | `/api/alerts/:id` | body: `Partial<Alert>`（如 `status: 'acked'`），回傳 `Alert` |

### 4. 型別參考（與 `src/types/` 一致）

- **Task**：`task.ts`（id, name, description, status, tags, owner, priority, scheduleType, scheduleExpr, lastRunStatus, lastRunAt, nextRunAt, inputs, outputs, acceptance, updatedAt, createdAt）
- **Run**：`run.ts`（id, taskId, taskName, status, startedAt, endedAt, durationMs, inputSummary, outputSummary, steps, error）
- **Alert**：`alert.ts`（id, type, severity, status, createdAt, message, relatedTaskId, relatedRunId）

後端回傳的 JSON 結構需與上述型別相容（欄位名、巢狀結構一致），中控台才能正確顯示。

---

## 三、接上後端的實作步驟（摘要）

1. **後端**：依「二」實作 REST API，並開放 CORS 給中控台網域。  
2. **中控台**：設定 `VITE_API_BASE_URL` 指向該後端。  
3. **驗證**：  
   - 任務列表、任務看板能從 API 載入。  
   - 點「立即執行」會呼叫 `POST /api/tasks/:taskId/run`，並在執行紀錄中看到新 Run。  
   - 警報列表、已讀／更新狀態正常。  

若後端路徑或欄位與上述不同，可再調整 `src/services/apiClient.ts` 的 URL 或對應欄位，保持與 `src/types/` 一致即可。
