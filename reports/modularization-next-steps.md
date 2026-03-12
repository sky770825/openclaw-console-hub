# 核心模組化 — 立即行動清單

## 決策確認（需要老蔡回覆）

1. *990 Lite 的具體功能* — 是什麼東西？掃描工具？報表生成？
2. *Auto-Executor 優先級* — 要在 Phase 4 就支持，還是之後再做？
3. *向下相容* — 舊 API 端點是否需要保留？
4. *時間窗口* — 4-6 週內能投入多少人力？

## 建議的第一步（不用等確認就能做）

### Task 1: 審視現有 openclawSupabase.ts
- 目的：理解當前數據層的實現
- 產出：一份「數據層現況文檔」，列出所有已有的 API
- 預計：2 小時

### Task 2: 提煉 executor-agents.ts 的核心邏輯
- 目的：識別哪些是業務邏輯、哪些是執行細節
- 產出：一份「邏輯層現況文檔」，分類現有函數
- 預計：3 小時

### Task 3: 設計 Data Layer API 規範
- 目的：定義未來 Data Persistence 模組的接口
- 產出：TypeScript interfaces + 使用範例
- 預計：4 小時

### Task 4: 開發 Phase 1 的第一個模組
- 目的：驗證模組化架構的可行性
- 產出：一個獨立的、可測試的 Data Layer 模組
- 預計：8 小時

## 建議分派

- *小蔡（NEUXA）*：Task 1, 2, 3（分析 + 規範設計）
- *Claude Code（小蔡）*：Task 4（實際開發）

## 預期時間線

- *本週*（第 1 週）：完成 Task 1-3，確認老蔡的決策
- *下週*（第 2 週）：開始 Phase 1，完成 Data Layer + Core Logic 的初版
- *第 3 週*：Phase 2，Gateway + User Management
- *第 4 週*：Phase 3，Notification + Action Executor
- *第 5-6 週*：Phase 4，990 Lite 接入 + Auto-Executor 準備