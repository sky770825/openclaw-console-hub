系統中存在兩種獨立的「心跳」機制，分別位於 `src/core/crew-bots/patrol.ts` 和 `src/core/telegram-control.ts`，功能與範疇不同：

### 1. `src/core/crew-bots/patrol.ts` (星群巡邏機制)

*   **目的**：為「星群」（Crew Bots，如阿研、阿數、阿秘等）設計的自動巡邏系統。
*   **觸發方式**：
    *   **手動**：在群組中發送「巡邏」或「報到」。
    *   **自動**：透過 `heartbeatEnabled` API 開關啟用或禁用定時心跳。預設為關閉，間隔時間可調整（預設