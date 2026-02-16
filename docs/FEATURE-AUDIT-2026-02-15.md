---
date: 2026-02-15
scope: taskboard-control-center
goal: "刪掉無用功能、保留能用功能、並提供可開關治理"
---

# 功能審計與分工（v1）

本文件是「中控台每個分頁、按鈕、資料寫入」的審計表。
原則：
- 不能用：刪掉或關掉（不留 UI 垃圾）
- 能用：標示 Read/Write、依安全策略保護（API Key / 角色）
- 可選：做 feature flag（可開關）

## 全域安全與治理（Backend）

- 讀寫權限：`server/src/index.ts`
  - `OPENCLAW_ENFORCE_WRITE_AUTH` 預設為 `true`（寫入需 key）
  - `OPENCLAW_ENFORCE_READ_AUTH` 設為 `true` 可擋未帶 key 的 GET（Dashboard 對外時建議）
  - Header：`x-api-key` 或 `Authorization: Bearer <key>`
- 分層金鑰：`OPENCLAW_READ_KEY` / `OPENCLAW_WRITE_KEY` / `OPENCLAW_ADMIN_KEY`
- Admin 操作（高風險）應只允許 admin key：
  - 重啟 gateway、觸發 webhook、修改 feature flags
- 設定指南：`docs/AUTH-SETUP.md`

## Feature Flags（可開關）

API：
- `GET /api/features`（Read）
- `PATCH /api/features`（Admin Write）

儲存：
- `server/.features.json`（可攜帶備份/移轉）

目前預設：
- `ops.incidentCreate = false`（因為原本是「模擬」）

## 分頁審計表

### 1) 儀表板 `/`
- 用處：高（總覽、啟停 AutoExecutor/Autopilot、健康狀態）
- Read/Write：R/W（啟停、緊急停止）
- 開關：可（`ops.emergencyStop`）
- 已處理：
  - 近期失敗執行的「重跑」按鈕已串接 `api.rerun`

### 2) OpenClaw Agent 板 `/cursor`
- 用處：中（偏展示/整合面板）
- Read/Write：R/W（依 openclaw-cursor.jsx 行為）
- 開關：可（`page.cursor`）
- 待處理：
  - 確認每個按鈕是否真的對應 API（避免再有「模擬」）

### 3) 任務看板 `/tasks`
- 用處：最高（主工作流）
- Read/Write：R/W
- 開關：不建議關（核心）
- 已強化：
  - domain 主分類 + 自動推斷
  - 空卡停止再生
  - 抽屜總覽加入「索引級內容 + SSoT 路徑 + SOP 路徑」
- 待處理：
  - Templates Library（任務一鍵套用可執行包）

### 4) 任務列表 `/tasks/list`
- 用處：高（批次操作、查找）
- Read/Write：R/W（批次 run/blocked）
- 開關：可（`task.bulkOps`）
- 待處理：
  - 批次操作需要權限提示（寫入需 key）

### 5) 執行紀錄 `/runs`
- 用處：高（debug/驗證）
- Read/Write：R/W（rerun）
- 開關：可（`page.runs`）
- 待處理：
  - Runs.tsx 仍有 mock override（需做成真 rerun/override 或移除）

### 6) 日誌 `/logs`
- 用處：中高（故障排查）
- Read/Write：R（export/篩選是前端行為）
- 開關：可（`page.logs`）

### 7) 警報 `/alerts`
- 用處：中（對應 reviews/alerts）
- Read/Write：R/W（ack/snooze）
- 開關：可（`page.alerts`）
- 已處理：
  - 「建立事件（模擬）」改為 feature gate：`ops.incidentCreate`
- 待處理：
  - 查看詳情要串接到 run/task 或 audit log

### 8) 發想審核 `/review`
- 用處：中（內容產出 pipeline）
- Read/Write：R/W（approve/reject）
- 開關：可（`page.review`）

### 9) 設定 `/settings`
- 用處：中（環境顯示/連線測試）
- Read/Write：R/W
- 開關：可（`page.settings`）
- 待處理：
  - 加入 feature flags UI（開關頁面與危險操作）

### 10) 領域分類 `/domains`
- 用處：中（taxonomy 可視化 + SOP 串接）
- Read/Write：R（copy）
- 開關：不需要

