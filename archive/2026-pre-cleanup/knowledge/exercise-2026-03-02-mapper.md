# 練習 A-2：OpenClaw Mapper 狀態轉換

> 日期：2026-03-02
> 來源：server/src/openclawMapper.ts

## 狀態映射表 (Status Mapping)

這份文件定義了 OpenClaw 後端資料庫狀態與前端應用狀態之間的轉換邏輯。

### 1. DB → 前端 (OC_TO_TASK_STATUS)
當從 Supabase 讀取任務顯示在前端時：

| OpenClaw (DB) | Task (Frontend) |
|---|---|
| queued | ready |
| in_progress | running |
| done | done |

### 2. 前端 → DB (TASK_TO_OC_STATUS)
當前端建立或更新任務寫回 Supabase 時：

| Task (Frontend) | OpenClaw (DB) |
|---|---|
| draft | queued |
| ready | queued |
| running | in_progress |
| review | in_progress |
| done | done |
| blocked | queued |

## 分類標準化 (Category Normalization)

系統只接受 4 種標準分類，其他輸入會被正規化：

| 輸入關鍵字 | 標準分類 |
|---|---|
| bug, fix, 錯誤, 修復 | bugfix |
| learn, study, research, 學習 | learn |
| perf, opt, stability, improve, 優化 | improve |
| (其他預設) | feature |

## Meta 資料處理
使用 <!--OC_META:...--> 標記在 thought 欄位中隱藏存儲額外屬性（如 owner, priority, tags 等）。