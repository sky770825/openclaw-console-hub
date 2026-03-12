# 智慧修行助手 v1 任務拆解（可貼任務板）

## A. 資料層

1. `SA-DB-001` 建立助手資料表
- 表：`assistant_daily_checkin`, `assistant_recommendations`, `assistant_tasks`, `assistant_reminders`
- 驗收：可成功 CRUD，且有必要索引

2. `SA-DB-002` RLS 權限
- 規則：member 僅能讀寫自己資料，admin 可讀全部
- 驗收：跨帳號讀寫被拒絕

3. `SA-DB-003` 關聯到 karma 系統
- 任務完成後可寫入 `karma_ledger`
- 驗收：完成任務可觸發分數更新

## B. API

1. `SA-API-001` `POST /api/assistant/checkin`
- 生成 `risk_score/risk_band/primary_risk_code`
- 驗收：同一天重送覆蓋或拒絕（規則固定）

2. `SA-API-002` `GET /api/assistant/recommendations/today`
- 依風險與層級輸出建議（含 why）
- 驗收：回傳 1~3 條可解釋建議

3. `SA-API-003` `POST /api/assistant/tasks/generate`
- 將建議轉為今日任務
- 驗收：任務建立成功，狀態為 pending

4. `SA-API-004` `PATCH /api/assistant/tasks/:id/progress`
- 任務打卡、更新完成度
- 驗收：完成後狀態切 completed

5. `SA-API-005` `GET /api/assistant/dashboard`
- 聚合今日狀態：risk、tasks、streak、距離目標差值
- 驗收：前端可一次取完主要數據

## C. 前端

1. `SA-FE-001` 助手面板 UI
- 區塊：每日三題、建議清單、任務進度
- 驗收：可完整跑診斷->建議->任務

2. `SA-FE-002` 儀表板整合
- 顯示：今日風險、當前道域、距離天道差值
- 驗收：數據刷新後即時更新

3. `SA-FE-003` 任務打卡互動
- 可填 evidence note，支持部分完成
- 驗收：重新整理後進度不丟失

## D. 規則引擎

1. `SA-RULE-001` 風險分級規則
- 0-33 low, 34-66 medium, 67-100 high
- 驗收：輸入邊界值結果正確

2. `SA-RULE-002` 建議映射規則
- speech/anger/greed/violence 對應固定建議模板
- 驗收：同風險代碼可穩定輸出相同模板

3. `SA-RULE-003` 預估分數影響
- 每條建議附 expected_delta
- 驗收：可被前端顯示與追蹤

## E. 測試

1. `SA-TEST-001` API 合約測試
- 驗收：所有助手 API 回傳格式一致

2. `SA-TEST-002` 權限測試
- 驗收：無法讀寫他人助手資料

3. `SA-TEST-003` E2E
- 流程：checkin -> 建議 -> 建任務 -> 打卡 -> 分數更新
- 驗收：全流程一次通過

## 建議排程（5 天）

1. Day1：A 全部 + `SA-API-001`
2. Day2：`SA-API-002` + `SA-RULE-*`
3. Day3：`SA-API-003/004/005`
4. Day4：`SA-FE-001/002/003`
5. Day5：`SA-TEST-*` + 修正
