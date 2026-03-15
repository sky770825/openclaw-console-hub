# 記錄官事件分類指南（Event Classification）
> 所有系統事件的分類標準，確保記錄一致、可查詢、可分析。

---

## 事件類型總覽

| 類型 | 代碼 | 嚴重度預設 | 說明 |
|------|------|-----------|------|
| 任務完成 | `task-completion` | info | 任務成功完成並產出交付物 |
| 任務失敗 | `task-failure` | warning | 任務執行失敗或被取消 |
| 系統錯誤 | `system-error` | error | 系統層級的錯誤或異常 |
| 部署事件 | `deployment` | info | 服務部署、更新、回滾 |
| 設定變更 | `config-change` | info | 系統設定、環境變數、權限變更 |
| Agent 通訊 | `agent-communication` | debug | Agent 之間的訊息傳遞與協作 |
| 使用者請求 | `user-request` | info | 主人或外部使用者的指令與需求 |
| 外部事件 | `external-event` | info | 第三方服務通知、webhook、排程觸發 |

---

## 詳細分類

### 1. task-completion（任務完成）
- **描述**：任務從 running 轉為 done，並有對應交付物
- **範例**：`content agent 完成「本週電子報草稿」，交付物：/crew/content/notes/newsletter-draft-0314.md`
- **嚴重度**：info
- **關注者**：ace（排程更新）、patrol（驗收追蹤）
- **記錄條件**：P0/P1 任務必定記錄；P2 任務記錄摘要

### 2. task-failure（任務失敗）
- **描述**：任務執行中發生錯誤或被判定失敗
- **範例**：`seo agent 執行「關鍵字分析」失敗，原因：API rate limit exceeded`
- **嚴重度**：warning
- **關注者**：ace（重新排程）、patrol（異常追蹤）、dar（若涉及系統問題）
- **記錄條件**：一律記錄，含錯誤原因與當時上下文

### 3. system-error（系統錯誤）
- **描述**：非任務層級的系統異常，如服務崩潰、資源耗盡
- **範例**：`Supabase 連線逾時，影響 3 個 agent 的資料查詢`
- **嚴重度**：error
- **關注者**：dar（系統修復）、agong（技術排查）、patrol（持續監控）
- **記錄條件**：一律記錄，含完整錯誤堆疊與影響範圍

### 4. deployment（部署事件）
- **描述**：服務的部署、更新或回滾操作
- **範例**：`前端服務 v2.3.1 部署成功，部署時間 3 分鐘`
- **嚴重度**：info（成功）/ warning（回滾）/ error（失敗）
- **關注者**：agong（技術確認）、patrol（部署後監控）
- **記錄條件**：一律記錄，含版本號、變更摘要、部署時間

### 5. config-change（設定變更）
- **描述**：系統設定、Agent 設定或環境變數的修改
- **範例**：`patrol agent 巡查頻率從 15 分鐘調整為 10 分鐘`
- **嚴重度**：info
- **關注者**：dar（權限變更需審核）、patrol（設定影響監控）
- **記錄條件**：一律記錄，含變更前後的值

### 6. agent-communication（Agent 通訊）
- **描述**：Agent 之間透過 inbox 或任務系統的訊息傳遞
- **範例**：`ace 指派任務給 content：撰寫產品更新公告`
- **嚴重度**：debug
- **關注者**：journal（歷史記錄）、patrol（通訊異常偵測）
- **記錄條件**：僅記錄關鍵協作節點（任務指派、交接、升級），日常訊息不記錄

### 7. user-request（使用者請求）
- **描述**：來自主人的直接指令或外部使用者的需求
- **範例**：`主人要求：「把首頁的 CTA 文案改成更有行動力的版本」`
- **嚴重度**：info
- **關注者**：ace（排程）、相關執行 agent
- **記錄條件**：一律記錄，含原始請求內容與指派結果

### 8. external-event（外部事件）
- **描述**：來自第三方服務的通知或排程觸發
- **範例**：`GitHub webhook：main branch 收到新 PR #47`
- **嚴重度**：info
- **關注者**：依事件內容分派
- **記錄條件**：影響系統運作的記錄，純資訊性的摘要記錄

---

## 重要性門檻（Materiality Threshold）

不是所有事件都需要完整記錄，依以下規則決定記錄深度：

| 條件 | 記錄深度 |
|------|---------|
| system-error（任何嚴重度） | 完整記錄（全部細節 + 上下文） |
| P0/P1 任務的 completion/failure | 完整記錄 |
| deployment（任何結果） | 完整記錄 |
| config-change | 完整記錄（含前後值） |
| user-request | 完整記錄 |
| P2 任務的 completion | 摘要記錄（一行描述） |
| agent-communication（日常） | 不記錄 |
| external-event（純資訊性） | 摘要記錄 |
