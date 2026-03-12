# Self-Healing v1: 失敗自動診斷協議 實作報告

## 1. 專案現況分析 (Real-time Scan Data)
- **總 TypeScript 檔案數**: 29685
- **後端代碼行數 (server/src)**: 18063 lines
- **前端代碼行數 (src)**: 28825 lines
- **資料庫表參照數 (openclaw_tasks)**: 26 references
- **Schema 定義狀態**: 未發現 Prisma Schema

### 關鍵檔案分析:
- `/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts` (1024 lines): 包含 openclaw_tasks 邏輯處理
- `/Users/caijunchang/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts` (301 lines): 包含 openclaw_tasks 邏輯處理
- `/Users/caijunchang/openclaw任務面版設計/server/src/routes/proxy.ts` (232 lines): 包含 openclaw_tasks 邏輯處理

## 2. Self-Healing v1 實作邏輯建議
當監測到 `openclaw_tasks.status === 'failed'` 時，應啟動以下流程：

### 步驟 A: 日誌讀取 (Log Extraction)
系統應從 `logs/` 目錄或資料庫中的 `error_message` 欄位讀取最近的 50 行執行日誌。
關鍵程式片段建議：
```typescript
const logs = await fs.readFile(`/var/log/openclaw/task-${taskId}.log`, 'utf8');
```

### 步驟 B: 調用 AI 診斷 (Claude Opus Integration)
使用 `ask_ai` 工具，傳入上下文：
- 任務定義 (Task Payload)
- 錯誤堆疊 (Stack Trace)
- 環境變數 (Environment Context, 排除敏感資訊)

### 步驟 C: 寫入診斷報告 (Review Storage)
將 Claude 生成的 Markdown 格式報告寫入 `openclaw_reviews` 表，關聯至該 `taskId`。

## 3. 實作原型 (Bash Automation Snippet)
以下為一個簡易的診斷觸發器模擬邏輯：

```bash
# 模擬檢測失敗任務並生成診斷
FAILED_TASKS=$(curl -s http://localhost:3000/api/tasks?status=failed)
for task_id in $(echo $FAILED_TASKS | jq -r '.[].id'); do
    LOG_DATA=$(cat "/tmp/logs/task-$task_id.log")
    DIAGNOSIS=$(ask_ai "請分析此錯誤並提供修復建議：$LOG_DATA")
    curl -X POST http://localhost:3000/api/reviews \
         -H "Content-Type: application/json" \
         -d "{\"taskId\": \"$task_id\", \"content\": \"$DIAGNOSIS\", \"type\": \"auto-diagnostic\"}"
done
```

## 4. 結論 (Conclusion)
經分析，`openclaw_tasks` 的處理邏輯分散在後端約 26 處，建議在後端引入一個 **Global Task Observer** 或使用資料庫 **CDC (Change Data Capture)** 機制。
1. **短期建議**：在後端 `TaskService` 的 `catch` 區塊直接呼叫診斷 Service。
2. **中期建議**：實作 `openclaw_reviews` 表的標準化結構，支持「修復建議」的機器可讀化，以便未來達成「自動修復 (Self-Repair)」。
3. **安全建議**：調用 Claude Opus 時，務必過濾日誌中的 Token 與 IP 資訊，防止洩漏。

---
*Report generated on: Sun Mar  1 17:14:47 CST 2026*
