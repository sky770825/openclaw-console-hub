# 會員系統可執行規格 v1（2026-02-28）

> 目的：把「會員 + 善惡結算 + 地域層級 + 業障補救 + 晉升條件」轉成可直接實作的工程規格。  
> 範圍：MVP 到 v1.0（Supabase + 前端頁面 + 後台管理 + 驗收測試）

---

## 1. 系統目標與邊界

### 1.1 v1 必做

- 會員登入（Email OTP）
- 會員檔案（display_name、修行偏好）
- 功過事件記錄（逐筆 ledger）
- 分數結算（即時 + 每日快照）
- 地域層級判定（六道 + 地獄層級）
- 補救建議（經文/遍數/天數）
- 晉升與降級條件
- 後台審核與規則管理
- 稽核日誌（誰改了什麼）

### 1.2 v1 不做

- 付費功能
- 多語系
- AI 自動判案
- 複雜社交機制（追蹤、私訊）

---

## 2. 核心領域模型

### 2.1 分數公式（統一口徑）

`net_score = merit_points - demerit_points - karma_debt + repentance_credit`

- `merit_points`: 善行累積分
- `demerit_points`: 過失累積分
- `karma_debt`: 重大惡業債（可疊加）
- `repentance_credit`: 補救完成可抵扣值

### 2.2 結算節點

- `即時結算`: 每次事件寫入後重算 current score
- `每日結算`: 每日 23:59:59（Asia/Taipei）產生快照
- `防重複`: 每次結算寫 `idempotency_key`

### 2.3 地域層級映射（v1）

| net_score 區間 | 道域 | 層級代碼 | 說明 |
|---|---|---|---|
| `>= 300` | 天庭候選 | `heaven_court_candidate` | 高階修行者，可進入晉升審核 |
| `100 ~ 299` | 天道 | `deva` | 福報穩定，需維持戒律 |
| `40 ~ 99` | 修羅/上升帶 | `asura_band` | 有福但競逐心重 |
| `-39 ~ 39` | 人道 | `human` | 可塑區間 |
| `-79 ~ -40` | 餓鬼道 | `preta` | 貪執與匱乏感強 |
| `-119 ~ -80` | 畜生道 | `animal` | 無明驅動高 |
| `<= -120` | 地獄道 | `hell` | 進入地獄層級判定 |

### 2.4 地獄層級映射（v1）

| 業障深度（abs(net_score)） | 地獄層級 | 痛苦等級 |
|---|---|---|
| `120 ~ 139` | 第 1-3 層 | 低 |
| `140 ~ 179` | 第 4-7 層 | 中 |
| `180 ~ 229` | 第 8-12 層 | 中高 |
| `230 ~ 299` | 第 13-16 層 | 高 |
| `>= 300` | 第 17-18 層 | 極高 |

---

## 3. 業障與補救規則（可配置）

### 3.1 過失類型（v1）

| 類型 | 代碼 | 基礎扣分 | 債務倍率 |
|---|---|---:|---:|
| 口業 | `speech_harm` | -8 | 1.0 |
| 貪婪 | `greed_harm` | -12 | 1.2 |
| 偽善 | `hypocrisy_harm` | -10 | 1.1 |
| 傷生 | `violence_harm` | -20 | 1.5 |
| 不孝/忘恩 | `filial_harm` | -15 | 1.3 |

### 3.2 補救建議模板（v1）

| 業障等級 | 條件 | 經文建議 | 週期 |
|---|---|---|---|
| 輕度 | `-1 ~ -39` | 心經 1 部 + 聖號 108 | 連續 7 天 |
| 中度 | `-40 ~ -79` | 心經 3 部 + 大悲咒 1 部 + 聖號 300 | 連續 14 天 |
| 重度 | `<= -80` | 地藏經定課 + 大悲咒 3 部 + 懺悔文 | 連續 49 天 |

### 3.3 補救加分規則（v1）

- 每日完成補救任務加 `repentance_credit`
- 同一模板連續完成第 8 天起收益遞減 20%
- 中斷一天，連續天數歸零

---

## 4. 晉升條件（天堂/天庭）

### 4.1 天道條件（v1）

- `net_score >= 100`
- 連續 21 天無重大惡業（`severity >= high`）
- 近 30 天補救完成率 >= 70%

### 4.2 天庭候選條件（v1）

- `net_score >= 300`
- 連續 90 天無重大惡業
- 利他事件（善行高權重）累積 >= 30 次
- 審核狀態為 `approved_by_moderator`

### 4.3 降級條件（v1）

- 單次重大惡業 `severity=critical`：立即降一級道域
- 連續 7 天無任何修行行為且 net_score 下滑 > 20：降級預警

---

## 5. 資料表與欄位（Supabase）

### 5.1 使用者與身份

`causelaw_members`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | 對應 auth.users.id |
| email | text | 會員 email |
| display_name | text | 顯示名稱 |
| role | text | `member/moderator/admin/superadmin` |
| status | text | `active/suspended/deleted` |
| created_at | timestamptz | 建立時間 |
| updated_at | timestamptz | 更新時間 |

### 5.2 功過逐筆事件

`karma_ledger`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | 事件 id |
| member_id | uuid fk | 會員 |
| event_type | text | `merit/demerit/repentance/penalty/adjustment` |
| category_code | text | 規則代碼 |
| points | int | 正負分 |
| karma_debt_delta | int | 債務增減 |
| source | text | `user/admin/system` |
| evidence | jsonb | 證據摘要 |
| rule_version | text | 規則版本 |
| idempotency_key | text unique | 防重複 |
| created_at | timestamptz | 建立時間 |

### 5.3 當前彙總

`karma_profile`

| 欄位 | 型別 | 說明 |
|---|---|---|
| member_id | uuid pk fk | 會員 |
| merit_points | int | 累積善分 |
| demerit_points | int | 累積過失 |
| karma_debt | int | 債務 |
| repentance_credit | int | 補救抵扣 |
| net_score | int | 淨分 |
| realm_code | text | 道域 |
| hell_level | int nullable | 地獄層級 |
| updated_at | timestamptz | 最後結算 |

### 5.4 每日快照

`karma_daily_snapshot`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | 快照 id |
| member_id | uuid fk | 會員 |
| snapshot_date | date | 台北時區日期 |
| net_score | int | 當日淨分 |
| realm_code | text | 當日道域 |
| hell_level | int nullable | 當日地獄層級 |
| rule_version | text | 當日規則版本 |
| unique(member_id, snapshot_date) | - | 防重複 |

### 5.5 補救任務

`repentance_tasks`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | 任務 id |
| member_id | uuid fk | 會員 |
| template_code | text | 補救模板 |
| required_days | int | 需要天數 |
| current_streak | int | 目前連續天數 |
| status | text | `active/completed/expired` |
| started_at | timestamptz | 開始時間 |
| completed_at | timestamptz nullable | 完成時間 |

### 5.6 內容審核

`causelaw_posts`、`causelaw_comments`（沿用現有）

`moderation_audit_log`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | 稽核 id |
| target_type | text | `post/comment/member/rule` |
| target_id | text | 目標 id |
| action | text | `approve/reject/adjust_score/ban` |
| actor_id | uuid | 操作者 |
| reason | text | 原因 |
| before_state | jsonb | 變更前 |
| after_state | jsonb | 變更後 |
| created_at | timestamptz | 時間 |

---

## 6. 狀態機（State Machine）

### 6.1 投稿審核

`draft -> pending -> approved/rejected -> appealed -> approved/rejected`

- `pending -> approved`: moderator/admin
- `pending -> rejected`: moderator/admin
- `rejected -> appealed`: member
- `appealed -> approved/rejected`: admin

### 6.2 會員狀態

`active -> suspended -> active`  
`active/suspended -> deleted`（不可逆，需資料清理流程）

### 6.3 補救任務

`active -> completed`  
`active -> expired`（中斷過久）

---

## 7. API 清單（v1）

> 可用 Supabase Edge Functions 或既有 server API 實作，以下為契約。

### 7.1 會員與身份

- `POST /api/member/login-otp`：寄 OTP
- `GET /api/member/me`：取會員資料 + karma_profile
- `PATCH /api/member/profile`：更新 display_name

### 7.2 功過與結算

- `POST /api/karma/events`：新增 ledger 事件（含 idempotency_key）
- `POST /api/karma/recalculate`：重算單一會員分數
- `GET /api/karma/profile/:memberId`：取當前分數與道域
- `GET /api/karma/snapshots/:memberId`：取每日趨勢

### 7.3 補救機制

- `POST /api/repentance/tasks`：建立補救任務
- `POST /api/repentance/checkin`：補救打卡
- `GET /api/repentance/tasks/:memberId`：查任務狀態與建議

### 7.4 內容與審核

- `POST /api/posts`：投稿（pending）
- `GET /api/posts?status=approved`：前台列表
- `GET /api/posts/:id`：文章詳情
- `POST /api/posts/:id/comments`：留言
- `POST /api/moderation/posts/:id/approve`
- `POST /api/moderation/posts/:id/reject`
- `POST /api/moderation/appeals/:id/resolve`

### 7.5 規則管理

- `GET /api/rules/current`
- `POST /api/rules/publish`：發佈新規則版本
- `POST /api/rules/simulate`：用新規則試算 impact

---

## 8. 後台管理頁規格（v1）

### 8.1 儀表板 `pages/admin-dashboard.html`

- 今日新增會員
- 投稿待審核數
- 各道域分布
- 高風險會員清單（業障突增）

### 8.2 內容審核 `pages/admin-content.html`

- 投稿/留言審核列表
- 一鍵 approve/reject
- 審核理由必填

### 8.3 會員中心 `pages/admin-members.html`

- 會員搜尋、狀態、角色管理
- 查看會員 karma_profile 與 ledger
- suspend/unsuspend

### 8.4 分數與規則 `pages/admin-rules.html`

- 規則版本列表
- 權重調整（需二次確認）
- 模擬試算（不落庫）

### 8.5 稽核頁 `pages/admin-audit.html`

- 所有管理操作 log
- 依 actor/action/date 篩選

---

## 9. RLS 與安全規格

### 9.1 原則

- member 只能讀/寫自己的資料
- 前台只能讀 `approved` 內容
- moderator/admin 才可審核與調分
- 所有管理寫入都必須落 `moderation_audit_log`

### 9.2 最小權限建議

- `anon`: 讀 approved posts/comments、建立 pending post/comment
- `authenticated`: 讀寫 own profile、讀 own karma
- `moderator`: 內容審核
- `admin`: 規則管理、會員狀態管理

---

## 10. 測試案例清單（可直接執行）

### 10.1 功能測試

| 編號 | 情境 | 預期 |
|---|---|---|
| F-01 | OTP 登入成功 | 可取得 member session |
| F-02 | 投稿建立 | status = pending |
| F-03 | 後台 approve 投稿 | 前台列表可見 |
| F-04 | 留言建立 | comment_count 正確 +1 |
| F-05 | 新增 demerit 事件 | net_score 下降且道域重算 |
| F-06 | 補救打卡連續 7 天 | repentance_credit 增加 |
| F-07 | 重大惡業事件 | 立即降級觸發 |

### 10.2 權限測試

| 編號 | 情境 | 預期 |
|---|---|---|
| A-01 | member 審核投稿 | 403 |
| A-02 | anon 讀 pending 投稿 | 403 或空結果 |
| A-03 | member 讀他人 karma_profile | 403 |
| A-04 | admin 調分 | 成功且產生 audit log |

### 10.3 一致性測試

| 編號 | 情境 | 預期 |
|---|---|---|
| C-01 | 同 idempotency_key 重送事件 | 只記一筆 |
| C-02 | 每日結算重跑 | 不重複快照 |
| C-03 | 規則升版後查歷史 | 舊資料保留舊 rule_version |

### 10.4 壓力與異常

| 編號 | 情境 | 預期 |
|---|---|---|
| P-01 | 1000 筆事件批量寫入 | 結算時間在目標 SLA 內 |
| P-02 | DB 暫時失敗 | 前端顯示可恢復錯誤訊息 |
| P-03 | 審核中斷重試 | 無重複審核副作用 |

---

## 11. 驗收標準（Definition of Done）

- 全部 API 契約完成並有測試覆蓋
- 會員、投稿、留言、審核、分數結算可端到端跑通
- 後台可查詢與操作（含 audit）
- RLS 驗證通過（權限測試全綠）
- 每日快照連續 3 天穩定產生
- 規則版本切換可用且可回溯

---

## 12. 上線分階段（建議）

### Phase 1（1 週）

- 完成資料表 + RLS + 會員與投稿/留言流程

### Phase 2（1 週）

- 完成 karma_ledger、結算、地域層級、補救任務

### Phase 3（1 週）

- 完成後台規則管理、audit、完整驗收與上線

---

## 13. 你可能沒想到但必須先決策的參數

- 時區固定：`Asia/Taipei`
- 每日結算時間：`23:59:59`
- 重大惡業判定閾值（severity 分級）
- 補救收益遞減曲線
- 晉升審核是否人工覆核（建議：是）
- 申訴期限（建議：7 天）

---

## 14. 實作對照（當前專案）

- 前端入口：`index.html`、`pages/forum.html`、`pages/post.html`、`pages/admin.html`
- 設定檔：`causelaw-config.js`
- 會員客戶端：`causelaw-client.js`
- 既有文件：`docs/SUPABASE-SETUP.md`、`docs/MERIT-SYSTEM-EXTENSION.md`

> 下一步建議：依本規格補一份 SQL migration（table/index/policy）與 API task list，直接進入開發排程。
