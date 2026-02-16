# OpenClaw 任務板 — Supabase 表結構

任務板後端使用下列表，RLS 啟用，由後端 service_role 存取。

## openclaw_tasks

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | 任務 ID |
| title | text | 標題 |
| cat | text | bugfix \| learn \| feature \| improve |
| status | text | queued \| in_progress \| done |
| progress | integer 0–100 | 進度 |
| auto | boolean | 是否自動化 |
| from_review_id | text | 來源審核 ID |
| subs | jsonb | [{ t, d }] 子任務 |
| thought | text | 備註／思維 |
| created_at, updated_at | timestamptz | |

## openclaw_reviews

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | |
| title | text | |
| type | text | tool \| skill \| issue \| learn |
| description | text | 描述（前端欄位 desc） |
| src, pri | text | 來源、優先級 |
| status | text | pending \| approved \| rejected |
| reasoning | text | 推理／理由 |
| created_at, updated_at | timestamptz | |

## openclaw_automations

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | |
| name, cron | text | |
| active | boolean | |
| chain | jsonb | 流程步驟陣列 |
| health, runs | integer | |
| last_run | text | |
| created_at, updated_at | timestamptz | |

## openclaw_evolution_log

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid PK | 預設 gen_random_uuid() |
| t | text | 時間標籤 |
| x | text | 內容 |
| c, tag, tc | text | 顏色、標籤、標籤顏色 |
| created_at | timestamptz | |

## 其他相關表

- **openclaw_ui_actions**：按鈕／UI 對應（可選）。
- **openclaw_audit_logs**：稽核紀錄（可選）。
- **openclaw_plugins**：Plugin 註冊（可選）。  
任務板核心僅依賴上述四張表。
