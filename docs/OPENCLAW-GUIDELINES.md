# OpenClaw 執行準則

用於 OpenClaw Agent 在 `/cursor` 頁面執行瀏覽、編輯操作時遵循的準則。採用**代碼化 selector**，無需快照即可直接操作。

---

## 一、操作方式：直接使用 data-oc-action

### 原則
- **不要**使用螢幕快照或座標點擊
- **請**使用 `data-oc-action` 對應的 CSS selector 執行點擊
- 所有可互動元件已標註 `data-oc-action="CODE"`，OpenClaw 可透過 `document.querySelector('[data-oc-action="CODE"]')` 取得元素並觸發 `click()`

### 範例
```javascript
// 正確：使用 selector
const el = document.querySelector('[data-oc-action="TAB_REVIEW"]');
if (el) el.click();

// 錯誤：使用座標或快照
// 不使用 x, y 座標或 accessibility tree snapshot
```

---

## 二、執行流程

1. **導航**：先點選 Tab 切換到對應區塊（總覽 / 審核 / 任務等）
2. **檢視**：點選 Card 或思維區塊開啟 Drawer 檢視詳情
3. **編輯**：在 Drawer 內點「編輯」→ 修改欄位 → 點「儲存」
4. **操作**：批准／駁回審核、推進任務、切換自動化開關

---

## 三、代碼命名規則

| 前綴 | 說明 | 範例 |
|------|------|------|
| TAB_ | 頁籤導航 | TAB_ALL, TAB_REVIEW |
| REVIEW_ | 審核相關 | REVIEW_APPROVE_r1, REVIEW_REJECT_r2 |
| TASK_ | 任務相關 | TASK_PROGRESS_t1, TASK_VIEW_t2 |
| AUTO_ | 自動化相關 | AUTO_TOGGLE_a1, AUTO_VIEW_a2 |
| DRAWER_ | Drawer 按鈕 | DRAWER_EDIT, DRAWER_SAVE, DRAWER_CLOSE |

完整對應表請見 `OPENCLAW-ACTION-MAP.md`。

---

## 四、與 API / n8n 的關聯

- 批准／駁回、推進任務、切換自動化、編輯儲存等操作，會自動呼叫後端 API 並寫入 Supabase
- n8n 工作流可透過 Webhook 接收 OpenClaw 的結果，與 API 端點對接
- 按鈕與 API 的對應關係儲存於 `openclaw_ui_actions` 表

---

## 五、效能優化

- 使用 selector 直接操作，不需截圖或解析頁面結構
- 減少視覺辨識與座標計算，降低延遲與 Token 消耗
