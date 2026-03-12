# 智慧修行助手 v1 規格（2026-02-28）

> 目標：把「智慧修行助手」從浮動按鈕升級為可診斷、可建議、可追蹤、可驗證成效的系統。

---

## 1. v1 功能範圍

### 1.1 必做

- 每日三題快速診斷（風險評估）
- 個人化修行建議（可解釋）
- 補救任務生成（可打卡）
- 今日儀表板（分數、層級、任務進度）
- 提醒節奏（早/晚）
- 連續行動追蹤（streak）

### 1.2 不做

- AI 自由問答聊天
- 語音對談
- 跨平台推播（先站內）

---

## 2. 使用者流程

1. 進入站點 → 點「智慧修行助手」
2. 完成「每日三題」診斷
3. 系統給出「今日修行處方」
4. 一鍵建立今日任務（念誦/止語/善行）
5. 使用者打卡完成
6. 助手更新分數影響與明日建議

---

## 3. 核心模組

### 3.1 診斷模組（Daily Check-in）

- 問題固定 3 題（v1）：
  - Q1：今天是否有明顯情緒起伏（0-4）
  - Q2：今天是否出現人際衝突（0-4）
  - Q3：今天是否有重複慣性惡行誘惑（0-4）
- 產出：
  - `risk_score`（0-100）
  - `risk_band`（low/medium/high）
  - `primary_risk_code`（speech/anger/greed/...）

### 3.2 建議引擎（Recommendation Engine）

- 輸入：
  - `risk_band`
  - `primary_risk_code`
  - `karma_profile`（net_score/realm/hell_level）
  - 最近 7 日行為摘要
- 輸出：
  - 今日建議清單（最多 3 條）
  - 每條建議附 `why` 與 `expected_delta`

### 3.3 任務模組（Task Plan）

- 任務類型（v1）：
  - `chanting`（念誦）
  - `speech_discipline`（止語）
  - `good_deed`（善行）
  - `repentance`（懺悔）
- 每個任務欄位：
  - 次數/遍數
  - 最晚完成時間
  - 完成證據（文字記錄）

### 3.4 回饋模組（Feedback）

- 完成任務後顯示：
  - 今日完成率
  - 連續天數
  - 對分數與層級的影響（估算）

---

## 4. 資料表設計（Supabase）

### 4.1 `assistant_daily_checkin`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | 對應 causelaw_members.id |
| checkin_date | date | 台北時區日期 |
| mood_level | int | 0-4 |
| conflict_level | int | 0-4 |
| temptation_level | int | 0-4 |
| risk_score | int | 0-100 |
| risk_band | text | low/medium/high |
| primary_risk_code | text | 主要風險類型 |
| created_at | timestamptz | |
| unique(member_id, checkin_date) | - | 每日一筆 |

### 4.2 `assistant_recommendations`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| checkin_id | uuid fk | 對應 checkin |
| recommendation_code | text | 建議代碼 |
| title | text | 建議標題 |
| detail | text | 建議內容 |
| why_text | text | 解釋原因 |
| expected_delta | int | 預估分數影響 |
| created_at | timestamptz | |

### 4.3 `assistant_tasks`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| task_date | date | 任務日期 |
| task_type | text | chanting/speech_discipline/good_deed/repentance |
| task_title | text | |
| target_count | int | 目標次數 |
| completed_count | int | 已完成次數 |
| status | text | pending/completed/expired |
| evidence_note | text | 使用者紀錄 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 4.4 `assistant_reminders`

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| remind_time | timestamptz | 提醒時間 |
| channel | text | in_app |
| message | text | 提醒內容 |
| status | text | queued/sent/read |
| created_at | timestamptz | |

---

## 5. API 契約（v1）

### 5.1 診斷

- `POST /api/assistant/checkin`
  - 請求：`mood_level`, `conflict_level`, `temptation_level`
  - 回應：`risk_score`, `risk_band`, `primary_risk_code`

### 5.2 建議

- `GET /api/assistant/recommendations/today`
  - 回應：建議清單（含 why + expected_delta）

### 5.3 任務

- `POST /api/assistant/tasks/generate`
  - 根據今日建議產生任務
- `PATCH /api/assistant/tasks/:id/progress`
  - 更新完成次數與 evidence
- `GET /api/assistant/tasks/today`
  - 回傳今日任務與完成率

### 5.4 儀表板

- `GET /api/assistant/dashboard`
  - 回傳：risk、今日任務、streak、realm 進度

---

## 6. 前端畫面草圖（Wireframe）

```text
+------------------------------------------------------+
| 智慧修行助手                                          |
| 今日風險：中   目前道域：人道   距離天道：+62         |
+------------------------------------------------------+
| 每日三題診斷                                          |
| [情緒起伏 0-4] [人際衝突 0-4] [惡行誘惑 0-4] [提交]   |
+------------------------------------------------------+
| 今日修行處方（3項）                                   |
| 1. 心經 3 部（原因：口業風險上升）    預估 +8         |
| 2. 止語任務 6 小時（原因：衝突傾向）   預估 +6         |
| 3. 善行 1 件（原因：平衡業障）         預估 +10        |
| [一鍵建立今日任務]                                    |
+------------------------------------------------------+
| 今日任務進度                                          |
| 心經 1/3   止語 3/6h   善行 0/1                        |
| [打卡] [補充紀錄]                                     |
+------------------------------------------------------+
```

---

## 7. 事件與規則映射（v1）

| primary_risk_code | 優先任務 | 建議經文 | 行為修正 |
|---|---|---|---|
| speech_harm | speech_discipline | 心經/大悲咒 | 止語、延遲回覆 |
| anger_harm | repentance | 心經 | 90 秒呼吸法 |
| greed_harm | good_deed | 地藏聖號 | 施捨/回饋 |
| violence_harm | repentance + chanting | 地藏經定課 | 懺悔與補救 |

---

## 8. 驗收標準（DoD）

- 每位會員每天只能提交一筆 checkin
- 可產生 1~3 條有解釋的建議
- 任務可建立、可打卡、可追蹤完成率
- 儀表板可正確顯示：
  - 今日風險
  - 今日任務
  - 連續天數
  - 與目標層級差距
- API 與資料表權限符合 RLS（僅本人可讀寫）

---

## 9. 建議實作順序（5 天）

1. Day1：建表 + RLS + `POST /checkin`
2. Day2：建議引擎 v1（rule-based）+ `GET /recommendations/today`
3. Day3：任務生成/打卡 API
4. Day4：前端助手面板 + 儀表板
5. Day5：E2E 測試 + 調整建議文案

---

## 10. 和現有系統整合點

- 讀取 `karma_profile`：判定目前道域/地獄層級
- 任務完成可寫入 `karma_ledger`（`event_type=repentance/merit`）
- 審核後投稿可觸發善行加分任務（可選）
