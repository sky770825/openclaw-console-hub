# OpenClaw 專案核心規範

> 讓所有任務、檔案、資料結構有一致語言。  
> 任務卡、UI、API 皆使用本文件定義之名詞。

---

## 名詞定義

### Task（任務）

**定義**：一個可被 OpenClaw 排程或觸發的「工作單位」。具備規格、狀態、優先級與執行紀錄。

- **任務卡**：Kanban 上的一張卡片，代表一個 Task。
- **狀態**：Draft → Ready → Running → Review → Done / Blocked（固定欄位，不另增）。
- **API**：`GET/POST/PATCH /tasks`、`GET /tasks/:id` 等以 `Task` 為資源主體。

**相關型別**：`Task`, `TaskStatus`, `ScheduleType`, `Priority`（見 `src/types/task.ts`）。

---

### Run（執行）

**定義**：某個 Task 的「一次執行實例」。記錄開始/結束時間、步驟、輸入輸出與錯誤。

- **執行紀錄**：每次手動或排程觸發任務，即產生一筆 Run。
- **狀態**：佇列中、執行中、成功、失敗、已取消。
- **API**：`GET /runs`、`GET /runs/:id`、`POST /tasks/:id/run` 等以 `Run` 為資源主體。

**相關型別**：`Run`, `RunStatus`, `RunStep`, `RunError`（見 `src/types/run.ts`）。

---

### Log（日誌）

**定義**：系統或任務在執行過程中產生的「事件紀錄」。用於除錯、稽核與監控。

- **日誌**：依時間序的訊息流，可依層級、任務、Run 篩選。
- **層級**：debug / info / warn / error。
- **API**：`GET /logs` 等以 `LogEntry` 為資源主體。

**相關型別**：`LogEntry`, `LogLevel`（見 `src/types/log.ts`）。

---

### Alert（警報）

**定義**：需要人工或系統關注的「異常或重要事件」。可與 Task / Run 關聯。

- **警報**：未處理、已確認、已延後等狀態。
- **嚴重度**：info / warning / critical。
- **API**：`GET /alerts`、`PATCH /alerts/:id` 等以 `Alert` 為資源主體。

**相關型別**：`Alert`, `AlertType`, `AlertSeverity`, `AlertStatus`（見 `src/types/alert.ts`）。

---

## 一致性原則

- **任務卡**：顯示欄位與狀態與本文件 + `src/types/task.ts` 一致。
- **UI**：所有頁面僅使用 `src/types/` 匯出之型別，不自行重複定義。
- **API**：請求/回應欄位名稱與型別與上述名詞定義對齊。

---

## 任務卡標準模板（OpenClaw 全用這個）

每張任務卡都填這 **6 欄**，OpenClaw 不會亂解讀、驗收快、後續可自動化（API / n8n）：

| 欄位 | 說明 |
|------|------|
| **Goal** | 這張任務要達成的目標（一句話） |
| **Inputs** | 需要的前置／輸入（可選） |
| **Outputs** | 產出（檔案、API、UI 等） |
| **Acceptance** | 驗收條件（做到才算完成） |
| **Owner** | 負責人 |
| **Priority (1–5)** | 優先級，1 最高、5 最低 |

範例（簡寫）：

```
Goal: 讓所有任務、檔案、資料結構有一致語言
Inputs: （無）
Outputs: docs/OPENCLAW-CONCEPT.md
Acceptance: 任務卡、UI、API 都用同一套名詞
Owner: OpenClaw
Priority: 5
```

---

## 最短路徑（建議節奏）

| 天 | 焦點 | 任務 |
|----|------|------|
| **Day 1** | 站穩 | T-01～T-06 放 Ready；Running 只放 T-01 或 T-02 |
| **Day 2** | Run 系統 | 完成 T-07、T-08（Run List + Run Detail） |
| **Day 3** | Logs + Alerts | T-10（Logs）、T-11（Alerts） |

---

*文件版本：第一階段（T-01 產出）*
