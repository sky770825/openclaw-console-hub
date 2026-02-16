# OpenClaw 操作代碼對照表

所有可點擊元件已加上 `data-oc-action`，OpenClaw 可透過 selector `[data-oc-action="CODE"]` 直接操作，無需快照。

---

## 1. Tab 導航

| 代碼 | Selector | 說明 |
|------|----------|------|
| TAB_ALL | `[data-oc-action="TAB_ALL"]` | 總覽 |
| TAB_AUTO | `[data-oc-action="TAB_AUTO"]` | ⚡ 自動化 |
| TAB_REVIEW | `[data-oc-action="TAB_REVIEW"]` | 🔍 審核 |
| TAB_TASKS | `[data-oc-action="TAB_TASKS"]` | 📊 任務 |
| TAB_N8N | `[data-oc-action="TAB_N8N"]` | 🔗 n8n |
| TAB_API | `[data-oc-action="TAB_API"]` | 🔌 API |
| TAB_SECURITY | `[data-oc-action="TAB_SECURITY"]` | 🛡️ 安全 |
| TAB_PLUGINS | `[data-oc-action="TAB_PLUGINS"]` | 🧩 Plugin |
| TAB_EVO | `[data-oc-action="TAB_EVO"]` | 🧬 進化 |

---

## 2. 審核中心

| 代碼 | Selector | 說明 |
|------|----------|------|
| REVIEW_CARD_{id} | `[data-oc-action="REVIEW_CARD_r1"]` | 審核卡片 |
| REVIEW_VIEW_{id} | `[data-oc-action="REVIEW_VIEW_r1"]` | 點擊推理區塊開啟 Drawer |
| REVIEW_APPROVE_{id} | `[data-oc-action="REVIEW_APPROVE_r1"]` | 批准按鈕 |
| REVIEW_REJECT_{id} | `[data-oc-action="REVIEW_REJECT_r1"]` | 駁回按鈕 |

---

## 3. 任務看板

| 代碼 | Selector | 說明 |
|------|----------|------|
| TASK_CARD_{id} | `[data-oc-action="TASK_CARD_t1"]` | 任務卡片 |
| TASK_VIEW_{id} | `[data-oc-action="TASK_VIEW_t1"]` | 點擊思維區塊開啟 Drawer |
| TASK_RUN_{id} | `[data-oc-action="TASK_RUN_t1"]` | 執行按鈕（僅 queued 任務顯示，呼叫 `POST /api/openclaw/tasks/:id/run`） |
| TASK_PROGRESS_{id} | `[data-oc-action="TASK_PROGRESS_t1"]` | 推進按鈕（僅進行中+自動化任務顯示） |
| TASK_DELETE_{id} | `[data-oc-action="TASK_DELETE_t1"]` | 刪除按鈕（呼叫 `DELETE /api/openclaw/tasks/:id`，測試完可刪除任務） |

---

## 4. 自動化流程

| 代碼 | Selector | 說明 |
|------|----------|------|
| AUTO_VIEW_{id} | `[data-oc-action="AUTO_VIEW_a1"]` | 點擊卡片開啟 Drawer |
| AUTO_TOGGLE_{id} | `[data-oc-action="AUTO_TOGGLE_a1"]` | 啟用/停用開關 |

---

## 5. Drawer 編輯

| 代碼 | Selector | 說明 |
|------|----------|------|
| DRAWER_EDIT | `[data-oc-action="DRAWER_EDIT"]` | 編輯按鈕 |
| DRAWER_SAVE | `[data-oc-action="DRAWER_SAVE"]` | 儲存按鈕 |
| DRAWER_CANCEL | `[data-oc-action="DRAWER_CANCEL"]` | 取消按鈕 |
| DRAWER_CLOSE | `[data-oc-action="DRAWER_CLOSE"]` | 關閉按鈕 |

---

## 6. 其他

| 代碼 | Selector | 說明 |
|------|----------|------|
| BTN_RESET_GATEWAY | `[data-oc-action="BTN_RESET_GATEWAY"]` | 重啟 Gateway：點擊後由後端自動於背景重啟 OpenClaw Gateway |

---

## 7. 使用範例

```javascript
// 切換到審核 Tab
document.querySelector('[data-oc-action="TAB_REVIEW"]')?.click();

// 批准審核項目 r1
document.querySelector('[data-oc-action="REVIEW_APPROVE_r1"]')?.click();

// 執行排隊任務 t3
document.querySelector('[data-oc-action="TASK_RUN_t3"]')?.click();

// 推進任務 t1
document.querySelector('[data-oc-action="TASK_PROGRESS_t1"]')?.click();

// 儲存 Drawer 編輯
document.querySelector('[data-oc-action="DRAWER_SAVE"]')?.click();
```

---

## 8. 資料庫對應

`openclaw_ui_actions` 表儲存 action_code、selector、label、api_path、n8n_webhook_url。可擴充 API 與 n8n 連結欄位。
