# Cursor 執行任務單（因果網站補強）

更新日期：2026-03-02  
適用範圍：`index.html`、`pages/*`、`docs/sql/*`

## 使用方式
1. 先做 `P0`，全部過關再進 `P1`。
2. 每一項都必須同時滿足 `DoD` 與 `測試步驟`。
3. 涉及資料庫的項目，請新增 migration 到 `docs/sql/`，不要只改前端。

---

## P0（必做：安全與資料一致性）

### P0-01 討論區與留言防 XSS
修改檔案：
- `pages/forum.html`
- `pages/post.html`

DoD：
1. 使用者輸入內容不再直接進 `innerHTML`。
2. 以 `textContent` 或 `escapeHtml` 後再渲染。
3. 標題、內文、留言、作者名稱都要防護。

測試步驟：
1. 貼文標題輸入 `<img src=x onerror=alert(1)>`。
2. 留言輸入 `<script>alert(1)</script>`。
3. 頁面可顯示原字串但不執行腳本。

### P0-02 計數改後端原子更新（view/comment/like）
修改檔案：
- `pages/post.html`
- `docs/sql/*.sql`（新增 RPC 或 trigger migration）

DoD：
1. 不再前端 `.update({view_count: ...})` 類型覆寫。
2. 改為後端原子遞增（`increment` RPC 或 SQL function）。
3. 併發下不丟計數。

測試步驟：
1. 同時開 3 個分頁點同一篇文章。
2. 同時按留言讚。
3. 計數最終值正確且無隨機回退。

### P0-03 修正 RLS 與前端寫入策略對齊
修改檔案：
- `docs/sql/2026-02-28-membership-v1.sql`
- `pages/post.html`

DoD：
1. 前端執行的寫入行為符合 RLS 政策。
2. 不會出現「前端嘗試更新，但 DB policy 不允許」的隱性失敗。
3. 錯誤訊息對使用者可理解。

測試步驟：
1. 以 member 身份發文、留言、按讚。
2. 檢查 Network 無 401/403 靜默錯誤。
3. 重新整理後資料與計數一致。

### P0-04 統一日期時區（功過格 vs 任務中心）
修改檔案：
- `pages/merit.html`
- `pages/tasks.html`
- 可選：新增共用 `date helper` 檔

DoD：
1. 功過格與任務中心使用同一日期計算函式。
2. 不再混用 `toISOString().slice(0,10)` 與 local date。
3. 在台灣時區跨日不出錯。

測試步驟：
1. 模擬本地時間 23:59 與 00:01。
2. 在兩頁同步/查詢任務。
3. 顯示日期與資料一致。

### P0-05 會員綁定補齊（post/comment/wall/merit）
修改檔案：
- `index.html`
- `pages/post.html`
- `pages/wall.html`
- `pages/merit.html`

DoD：
1. 會員登入後，寫入資料都帶 `user_id/member_id`。
2. 未登入可匿名，但 schema 仍可追蹤來源模式。
3. 不再出現「查無會員檔案」阻斷主要流程。

測試步驟：
1. 登入後投稿、留言、發牆內容、同步功過。
2. DB 檢查資料都掛到同一會員。
3. 登出改匿名，流程仍正常。

### P0-06 表單驗證與防濫用
修改檔案：
- `index.html`
- `pages/post.html`
- `pages/wall.html`
- 新增 SQL migration（長度限制與檢核）

DoD：
1. 表單加入 `maxlength/minlength/trim`。
2. 擋空白灌水、重複短時間提交。
3. 回傳明確錯誤提示（非 console-only）。

測試步驟：
1. 送空白、超長、重複 10 次快速送出。
2. 系統阻擋並顯示提示。
3. 正常內容仍可成功送出。

### P0-07 全站移除原生 alert/prompt/confirm
修改檔案：
- `index.html`
- `pages/forum.html`
- `pages/wall.html`
- `pages/merit.html`
- `pages/admin.html`

DoD：
1. 改成站內統一 toast/modal。
2. 視覺一致，訊息有成功/失敗/警告三種樣式。
3. 不阻斷輸入焦點與流程。

測試步驟：
1. 觸發登入、投稿、同步、審核等流程。
2. 全部以站內訊息顯示。
3. 不再出現瀏覽器原生彈窗。

### P0-08 隱私政策與資料使用說明對齊現況
修改檔案：
- `index.html`
- `pages/forum.html`
- `pages/wall.html`
- 建議新增 `pages/privacy.html`

DoD：
1. 清楚寫明本機資料與雲端資料差異。
2. 說明資料用途、公開可見範圍、保留與刪除方式。
3. 首頁 footer 文案與真實行為一致。

測試步驟：
1. 人工檢查文案與實際流程是否一致。
2. 新使用者可在 1 分鐘內理解資料如何被存。

---

## P1（功能完整化）

### P1-01 討論區搜尋與分頁
修改檔案：
- `pages/forum.html`

DoD：
1. 支援標題/內容關鍵字搜尋。
2. 支援分頁或「載入更多」。
3. 篩選、排序、搜尋可共同作用。

測試步驟：
1. 輸入關鍵字，確認結果正確。
2. 切分類與排序後仍正確。
3. 大量資料下頁面不卡頓。

### P1-02 留言回覆功能實作（parent_id）
修改檔案：
- `pages/post.html`

DoD：
1. 可回覆指定留言。
2. `parent_id` 正確寫入。
3. 顯示層級清楚（至少兩層）。

測試步驟：
1. 新增主留言，再回覆。
2. 重新整理後回覆關係不丟失。

### P1-03 討論區分享功能
修改檔案：
- `pages/post.html`

DoD：
1. 提供複製連結按鈕。
2. 可選 Web Share API（行動裝置）。
3. 成功/失敗都有回饋訊息。

測試步驟：
1. 複製貼上連結可回到正確文章。
2. 手機端可呼叫系統分享。

### P1-04 會員中心（我的投稿/留言/任務）
修改檔案：
- 新增 `pages/member.html`
- 連動 `causelaw-client.js`

DoD：
1. 會員可查看自己的投稿與留言紀錄。
2. 可查看今日與歷史任務完成度。
3. 未登入導向登入提示。

測試步驟：
1. 登入後可見個人資料。
2. 登出後不可見敏感資料。

### P1-05 功過格歷史化（日/週/月）
修改檔案：
- `pages/merit.html`
- SQL migration（新增日快照表或使用既有表）

DoD：
1. 可查看歷史日期紀錄。
2. 顯示週/月趨勢與淨值曲線。
3. 同步後可反查當日任務與建議。

測試步驟：
1. 建立連續 3 天資料。
2. 歷史頁顯示完整且不混日期。

### P1-06 任務去重（DB 唯一鍵 + upsert）
修改檔案：
- `pages/merit.html`
- `docs/sql/2026-02-28-smart-assistant-v1-isolated-schema.sql`（或新 migration）

DoD：
1. 任務資料表有合理唯一鍵（如 `member_id + task_date + task_type + task_title`）。
2. 連點同步不重複建任務。
3. 任務計數與 karma 積分不重複加成。

測試步驟：
1. 連續點同步 5 次。
2. DB 僅有單筆對應任務。

### P1-07 懺悔牆模式定稿（個人牆/公共牆）
修改檔案：
- `pages/wall.html`
- `docs/sql/2026-03-01-member-practice-bridge.sql`

DoD：
1. 產品定義與 RLS 一致。
2. 文案與實際可見範圍一致。
3. 若是公共牆，匿名規則與展示策略明確。

測試步驟：
1. A 帳號發佈，B 帳號查看可見性符合設計。
2. 管理員權限可正常管理。

### P1-08 懺悔牆治理（檢舉/下架/刪除）
修改檔案：
- `pages/wall.html`
- `pages/admin.html`
- SQL migration（檢舉表與狀態欄）

DoD：
1. 使用者可刪自己的內容。
2. 可檢舉不當內容。
3. 管理員可下架並留稽核紀錄。

測試步驟：
1. 建立測試內容並檢舉。
2. 管理員下架後前台不可見。

### P1-09 測驗題庫化與多維度分析
修改檔案：
- `pages/quiz.html`
- 新增 `data/quiz-questions.json`

DoD：
1. 題庫由 JSON 載入，支援隨機題序。
2. 結果至少輸出口業/貪念/嗔念 3 維度。
3. 結果頁給下一步行動（導功過格、懺悔牆、任務中心）。

測試步驟：
1. 連續做兩次，題序不同。
2. 不同作答路徑得到不同維度結果。

---

## P2（工程化與營運）

### P2-01 抽共用元件（Auth/Toast/Nav）
DoD：
1. 各頁不再複製貼上同一份 auth 事件綁定。
2. 共用模組可被 index 與子頁共用。

### P2-02 建立最小 E2E 測試
DoD：
1. 至少覆蓋投稿、留言、功過同步、牆發佈、測驗完成五條主路徑。
2. PR 可自動跑。

### P2-03 事件追蹤與漏斗
DoD：
1. 可追蹤投稿轉換率、留言率、測驗完成率、任務完成率。
2. 提供每日統計報表。

### P2-04 效能與安全部署
DoD：
1. Tailwind 由 CDN 改建置輸出。
2. 加 CSP/SRI/基本安全 header。
3. 首頁與核心頁 Lighthouse 指標提升。

---

## 完工定義（全案）
1. `P0` 全數完成且有測試紀錄。
2. 無高風險安全問題（XSS、權限錯配、資料覆寫）。
3. 主要流程端到端可用：會員登入 -> 投稿 -> 審核 -> 討論 -> 功過同步 -> 任務 -> 懺悔/祈福 -> 測驗導流。
