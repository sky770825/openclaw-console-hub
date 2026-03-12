# 練習報告：任務路由對比 (G1) - 完結

## 1. 職責分析
- openclaw-tasks.ts: 前端看板專用。負責 status 映射 (queued->ready) 與 quality 分數解析。支援 promptGuard。
- tasks.ts: 標準 API 接口。提供批次刪除與 Zod 驗證。直接映射原始資料。

## 2. 核心發現
兩者共用 openclawSupabase.ts 數據層，但 openclaw-tasks 具備更高階的 UI 適配邏輯。

## 3. 建議
維持並行：看板操作走 openclaw-tasks，系統級/批次操作走 tasks。