# 練習 G-1：create_task Action 呼叫鏈追蹤

### 1. 呼叫鏈分析
- 起點：server/src/telegram/action-handlers.ts 中的 createTask 函式。它是 NEUXA 接收到 JSON 指令後的處理入口。
- 中間層：createTask 內部呼叫了來自 ../openclawSupabase.js 的 upsertOpenClawTask。
- 終點：server/src/openclawSupabase.ts 的 upsertOpenClawTask 函式，最終使用 supabase.from('openclaw_tasks').upsert(data) 將任務存入資料庫。

### 2. 關鍵函式定位
- action-handlers.ts: export async function createTask(name: string, ...)
- openclawSupabase.ts: export const upsertOpenClawTask = async (task: OpenClawTask) => ...

### 3. 資料流結語
Action 指令 → action-handlers (封裝) → openclawSupabase (資料庫操作) → Supabase 雲端。路徑清晰且符合職責分離原則。