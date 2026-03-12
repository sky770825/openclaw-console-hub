# API 任務拆解（可貼任務板）v1

> 來源：`MEMBERSHIP-EXEC-SPEC-v1-2026-02-28.md`  
> 用途：直接建立任務卡，分配給 auto-executor / Claude Code / 後端同事。

---

## A. 基礎建設

1. `DB-001` 套用 migration
- 說明：執行 `docs/sql/2026-02-28-membership-v1.sql`
- 驗收：所有表/索引/函式/政策建立成功，無錯誤

2. `DB-002` 建立測試帳號角色
- 說明：建立 `member`, `moderator`, `admin` 三組測試身份（JWT role）
- 驗收：三角色可登入且權限符合預期

3. `DB-003` 建立 seed data
- 說明：插入 5 位會員、20 筆文章、40 筆留言、50 筆 karma ledger
- 驗收：前台頁面能看出分布差異

---

## B. 會員 API

1. `API-MEMBER-001` `GET /api/member/me`
- 功能：回傳 member profile + karma_profile + 當前 realm/hell_level
- 驗收：登入後可取得自己的完整資料；未登入 401

2. `API-MEMBER-002` `PATCH /api/member/profile`
- 功能：更新 `display_name`
- 驗收：僅能改自己的 profile；admin 可改他人

3. `API-MEMBER-003` `POST /api/member/login-otp`
- 功能：觸發 OTP（若已用 Supabase Auth，可包一層後端）
- 驗收：成功寄送 OTP；錯誤回傳格式一致

---

## C. 投稿與留言 API

1. `API-POST-001` `POST /api/posts`
- 功能：建立投稿，預設 `status=pending`
- 驗收：投稿成功後在 admin 待審核列表可見

2. `API-POST-002` `GET /api/posts?status=approved`
- 功能：前台列表查詢（含分頁、排序）
- 驗收：只回 approved；支持 `latest/hot/comments` 排序

3. `API-POST-003` `GET /api/posts/:id`
- 功能：詳情查詢 + view_count +1（防重複刷新策略）
- 驗收：每次開啟可正確更新瀏覽數

4. `API-COMMENT-001` `POST /api/posts/:id/comments`
- 功能：新增留言，更新文章 comment_count
- 驗收：留言成功後列表立刻可見，comment_count 一致

---

## D. 審核與後台 API

1. `API-MOD-001` `POST /api/moderation/posts/:id/approve`
- 功能：pending -> approved，寫 `moderation_audit_log`
- 驗收：審核後前台可見，audit 有記錄

2. `API-MOD-002` `POST /api/moderation/posts/:id/reject`
- 功能：pending -> rejected，附 reason，寫 audit
- 驗收：被拒稿件前台不可見，audit 有 before/after

3. `API-MOD-003` `POST /api/moderation/appeals/:id/resolve`
- 功能：申訴結案（approved/rejected）
- 驗收：狀態流轉合法，不可跳過必要狀態

4. `API-MOD-004` `GET /api/moderation/logs`
- 功能：審核與管理行為查詢（過濾 actor/action/date）
- 驗收：admin 可查，member 403

---

## E. Karma/結算 API

1. `API-KARMA-001` `POST /api/karma/events`
- 功能：寫入 `karma_ledger`（支援 `idempotency_key`）
- 驗收：重送同 key 不重複入帳

2. `API-KARMA-002` `POST /api/karma/recalculate`
- 功能：呼叫 `recalculate_karma_profile(member_id)`
- 驗收：net_score/realm/hell_level 正確更新

3. `API-KARMA-003` `GET /api/karma/profile/:memberId`
- 功能：取當前分數與層級
- 驗收：本人可查自己，admin 可查全部

4. `API-KARMA-004` `GET /api/karma/snapshots/:memberId`
- 功能：取近 N 日趨勢
- 驗收：可回傳連續日期快照，空值補齊策略一致

---

## F. 補救任務 API

1. `API-REP-001` `POST /api/repentance/tasks`
- 功能：建立補救任務（依業障等級選模板）
- 驗收：required_days 與 template_code 符合規則

2. `API-REP-002` `POST /api/repentance/checkin`
- 功能：每日打卡、連續天數更新、可產生 repentance_credit
- 驗收：中斷會歸零；第 8 天起收益遞減

3. `API-REP-003` `GET /api/repentance/tasks/:memberId`
- 功能：回傳 active/completed/expired 與建議
- 驗收：前台可直接渲染任務進度

---

## G. 前端串接任務

1. `FE-001` 首頁會員欄
- 功能：顯示登入狀態、顯示名稱、登出
- 驗收：切換登入狀態 UI 正確

2. `FE-002` 討論區資料源切換
- 功能：優先 API，失敗 fallback 本地
- 驗收：斷網時可用，連網時顯示雲端資料

3. `FE-003` 投稿詳情留言區
- 功能：留言、按讚、comment_count 同步
- 驗收：刷新後資料一致

4. `FE-004` 後台審核頁
- 功能：pending 列表、approve/reject、理由必填
- 驗收：每次操作均有 audit 可查

---

## H. 測試任務

1. `TEST-001` 權限測試（RLS）
- 驗收：member 無法審核，anon 無法讀 pending

2. `TEST-002` API 合約測試
- 驗收：各 API 回應格式固定（成功/失敗碼）

3. `TEST-003` E2E 流程
- 驗收：登入 -> 投稿 -> 審核 -> 前台可見 -> 留言 -> 分數更新

4. `TEST-004` 一致性測試
- 驗收：idempotency、生效規則版本、每日快照不重複

---

## 建議優先順序（兩週）

1. Week 1：`DB-001~003`, `API-POST-*`, `API-MOD-*`, `FE-004`
2. Week 2：`API-KARMA-*`, `API-REP-*`, `FE-001~003`, `TEST-*`
