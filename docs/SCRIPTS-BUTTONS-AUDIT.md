# 腳本與按鈕稽核

本文檔稽核專案內所有腳本、看板按鈕，以及其對應的 API 與自動化能力。

---

## 一、腳本清單

| 腳本 | 路徑 | 用途 | 狀態 |
|------|------|------|------|
| 重啟 Gateway | `scripts/restart-openclaw-gateway.sh` | 手動重啟 OpenClaw Gateway（優先 `openclaw gateway restart`，無服務時 pkill + 手動啟動） | ✅ 已完成 |

**備註**：
- 腳本預設寫入專案根目錄 `scripts/`，執行前請確認 `openclaw` CLI 已安裝。
- 後端 `POST /api/openclaw/restart-gateway` 會呼叫同邏輯（後端與 Gateway 需在同一台機器）。

---

## 二、按鈕與 data-oc-action 對照

### 2.1 Tab 導航

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| TAB_ALL | 總覽 | — | 僅 UI 切換 |
| TAB_AUTO | 自動化 | — | 僅 UI 切換 |
| TAB_REVIEW | 審核 | — | 僅 UI 切換 |
| TAB_TASKS | 任務 | — | 僅 UI 切換 |
| TAB_N8N | n8n | — | 僅 UI 切換 |
| TAB_API | API | — | 僅 UI 切換 |
| TAB_SECURITY | 安全 | — | 僅 UI 切換 |
| TAB_PLUGINS | Plugin | — | 僅 UI 切換 |
| TAB_EVO | 進化 | — | 僅 UI 切換 |

### 2.2 審核中心按鈕

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| REVIEW_APPROVE_{id} | 批准審核 | `PATCH /api/openclaw/reviews/:id` `{ status: 'approved' }` | ✅ |
| REVIEW_REJECT_{id} | 駁回審核 | `PATCH /api/openclaw/reviews/:id` `{ status: 'rejected' }` | ✅ |

### 2.3 任務看板按鈕

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| TASK_RUN_{id} | 執行任務 | `POST /api/openclaw/tasks/:id/run` | ✅ |
| TASK_PROGRESS_{id} | 推進任務 | `PATCH /api/openclaw/tasks/:id`（更新 subs + progress + status） | ✅ |
| TASK_DELETE_{id} | 刪除任務 | `DELETE /api/openclaw/tasks/:id` | ✅ |

### 2.4 自動化流程按鈕

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| AUTO_TOGGLE_{id} | 啟用/停用 | `PATCH /api/openclaw/automations/:id` `{ active: true/false }` | ✅ |

### 2.5 Drawer 按鈕

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| DRAWER_EDIT | 編輯 | — | 僅 UI |
| DRAWER_SAVE | 儲存 | 依類型：`PATCH tasks/reviews/automations` | ✅ 可透過程式呼叫 PATCH |
| DRAWER_CANCEL | 取消 | — | 僅 UI |
| DRAWER_CLOSE | 關閉 | — | 僅 UI |

### 2.6 其他按鈕

| data-oc-action | 說明 | API 對應 | 可自動化 |
|----------------|------|----------|----------|
| BTN_RESET_GATEWAY | 重啟 Gateway | `POST /api/openclaw/restart-gateway` | ✅ |

---

## 三、按鈕 → OpenClaw 連動摘要

| 功能 | 對應 API | cron / n8n 可用 | OpenClaw 可呼叫 |
|------|----------|-----------------|-----------------|
| 執行任務 | `POST /api/openclaw/tasks/:id/run` | ✅ | ✅ |
| 執行下一個 queued 任務 | `POST /api/openclaw/run-next` | ✅ | ✅ |
| 批准審核 | `PATCH /api/openclaw/reviews/:id` | ✅ | ✅ |
| 駁回審核 | `PATCH /api/openclaw/reviews/:id` | ✅ | ✅ |
| 啟用/停用自動化 | `PATCH /api/openclaw/automations/:id` | ✅ | ✅ |
| 刪除任務 | `DELETE /api/openclaw/tasks/:id` | ✅ | ✅ |
| 重啟 Gateway | `POST /api/openclaw/restart-gateway` | ✅ | ✅ |

**結論**：所有具業務邏輯的按鈕均有對應 API，可透過 cron、n8n 或 OpenClaw Agent 自動化執行。

---

## 四、建議新增腳本（可選）

| 腳本名稱 | 用途 |
|----------|------|
| `scripts/run-next-task.sh` | 呼叫 `POST /api/openclaw/run-next`，供 crontab 使用 |
| `scripts/approve-review.sh` | 傳入 review id，呼叫 PATCH approve，供 Telegram / CLI 使用 |
| `scripts/reject-review.sh` | 傳入 review id，呼叫 PATCH reject |

---

## 五、參考

- `docs/OPENCLAW-ACTION-MAP.md` — data-oc-action selector 對照
- `docs/OPENCLAW-INTEGRATION.md` — API 與自動化範例
- `server/src/index.ts` — 後端 API 實作
