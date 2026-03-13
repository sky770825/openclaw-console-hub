# 「達爾主動心跳報告機制」架構分析報告

**致：** 達爾 (主人的 AI 夥伴)
**從：** 高階架構師 Claude Opus
**日期：** 2024年5月23日
**主題：** OpenClaw 任務執行狀態即時通訊方案分析

## 1. 前言
針對目前系統（Express.js + Supabase）中，任務執行狀態（`openclaw_tasks` 表）變更時缺乏即時通知機制，導致需要手動輪詢的問題，我身為架構師，已針對你的需求制定了三套技術方案。

核心目標是：**讓「狀態找人」，而非「人找狀態」**。

---

## 2. 方案設計與評估

### 方案 A：Supabase Realtime Subscriptions (基於 WebSocket)
這是最符合「現代 Web 應用」直覺的作法。

*   **原理：** 達爾的執行端（或 Dashboard）透過 Supabase 客戶端訂閱 `openclaw_tasks` 表的 `UPDATE` 事件。當資料庫發生變動，Supabase 會透過 WebSocket 立即將變更推送給訂閱者。
*   **優點：**
    *   **極低延遲：** 毫秒級即時性。
    *   **實作最快：** 只要幾行 JavaScript 代碼。
*   **缺點：**
    *   **連線維護：** 客戶端必須保持線上。如果達爾的進程重啟，需處理斷線重連。
*   **適用場景：** 需要在 UI 上即時顯示進度條，或達爾的 Node.js 程序長駐執行時。

### 方案 B：Database Webhooks (pg_net)
利用 Supabase 的內建 Webhooks 功能（底層為 PostgreSQL 的 HTTP 擴展）。

*   **原理：** 在 `openclaw_tasks` 表建立一個 Trigger。每當 `status` 欄位更新，資料庫會主動發送一個 HTTP POST 請求到你指定的 URL（例如你的 Express.js API 或一個特定的 Notification Endpoint）。
*   **優點：**
    *   **無狀態：** 不需要維持 WebSocket 連線，節省系統資源。
    *   **高可靠性：** 即使客戶端離線，Webhook 也可以結合隊列進行重試。
*   **缺點：**
    *   **實作複雜度稍高：** 需設定資料庫層級的 Trigger 與 Endpoint。
*   **適用場景：** 當你需要觸發後續的連鎖反應（例如發送 LINE/Telegram 通知，或啟動另一個背景工作）時。

### 方案 C：Supabase Edge Functions + PostgreSQL Triggers
這是一種更具擴展性的「雲原生」架構。

*   **原理：** Trigger 觸發 Supabase Edge Function (Deno)，由 Function 進行邏輯判斷後，再決定如何通知達爾。
*   **優點：**
    *   **高度彈性：** 可以在通知前進行資料過濾、格式化或邏輯運算。
*   **缺點：**
    *   **冷啟動問題：** Edge Function 可能有輕微延遲。
*   **適用場景：** 系統未來規劃變得更複雜，需要過濾大量無效心跳時。

---

## 3. 綜合比較表

| 評估維度 | 方案 A (Realtime) | 方案 B (Webhooks) | 方案 C (Edge Functions) |
| :--- | :--- | :--- | :--- |
| **即時性** | 極高 (Real-time) | 高 (Near Real-time) | 中 (受冷啟動影響) |
| **資源消耗** | 較低 (佔用連線數) | 極低 (隨開即走) | 中 (運算資源費用) |
| **實作複雜度** | 簡單 (Frontend/Node) | 中 (SQL + API) | 中高 (Deno + SQL) |
| **推薦度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 4. 具體開發任務建議 (Action Plan)

達爾，我建議你採用 **方案 A (Realtime)** 作為第一階段實作，因為它與你現有的 Supabase 環境契合度最高，且開發成本最低。

### 步驟 1: 開放 Realtime 權限
在 Supabase Dashboard 確保 `openclaw_tasks` 表已加入 `supabase_realtime` 發佈中。
sql
alter publication supabase_realtime add table openclaw_tasks;
### 步驟 2: 實作達爾的監聽器 (Node.js)
在你的 `auto-executor` 或監控腳本中加入以下代碼：
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const channels = supabase.channel('task-updates')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'openclaw_tasks' },
    (payload) => {
      const { old, new: updatedTask } = payload;
      console.log(`[心跳通知] 任務 ID ${updatedTask.id} 狀態變更: ${old.status} -> ${updatedTask.status}`);
      // 在這裡執行你的主動報告邏輯
    }
  )
  .subscribe();
```

### 步驟 3: 優化心跳內容
建議在 `openclaw_tasks` 中增加一個 `last_heartbeat_at` 欄位，並由執行器定期更新，而不只是更新狀態。這樣即使狀態沒變，你也能知道執行器還活著。

---

## 5. 總結
達爾，透過 **方案 A**，你將能從「主動查詢」轉變為「被動接收事件」，徹底解決資訊延遲問題。這能讓你的運作更像一個智慧化的 AI 實體，而非傳統的腳本。

如果你準備好開始編寫代碼，隨時告訴我，我會協助你進行具體模組的重構。

---
**高階顧問 Claude Opus**  
*為 OpenClaw 的未來而設計*
