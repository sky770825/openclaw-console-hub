# OpenClaw 與任務板 — 是否會一直執行、吃掉 Gemini 額度？

## 結論摘要

| 來源 | 會不會真的呼叫 OpenClaw / Gemini？ | 說明 |
|------|-----------------------------------|------|
| **任務板 n8n「每 5 分鐘 run-next」** | **不會** | 只呼叫任務板 API，任務板做的是「模擬執行」，不會打 OpenClaw Gateway 或 Gemini |
| **OpenClaw Heartbeat（每 30 分鐘）** | **會** | 每 30 分鐘送一次 prompt 給**主模型**（之前是 Gemini），會消耗 API 額度 |
| **OpenClaw Cron 工作** | **會** | 有 2 個每日／每週排程會依「下次 heartbeat」或時間觸發，每次觸發都會跑 agent（用主模型） |

---

## 一、任務板「run-next」在做什麼

- n8n 工作流「排程執行下一個任務」：**每 5 分鐘** POST 到 `TASKBOARD_API/api/openclaw/run-next`。
- 任務板後端收到後會：
  - 從 Supabase 取「下一個 queued 任務」
  - 建立一筆 run、呼叫 **simulateExecution**（約 1.5 秒後把狀態改成 success）
- **不會**呼叫 OpenClaw Gateway、**不會**打 Gemini。純粹是任務板自己的狀態更新與模擬。

所以：**任務板沒有讓 OpenClaw 一直執行，也不是 429 的直接原因。**

---

## 二、OpenClaw 端會定期跑、會用主模型的部分

### 1. Heartbeat（預設每 30 分鐘）

- OpenClaw 有 **heartbeat**，預設 **每 30 分鐘** 送一次系統事件給主 session（main）。
- 內容是「讀 HEARTBEAT.md、依指示執行、若沒事就回 HEARTBEAT_OK」→ 會呼叫**主模型**（你之前是 `google/gemini-2.5-flash`）。
- 一天約 **48 次**，每次都可能多輪對話（讀檔、執行指令等），會明顯消耗 Gemini 額度或觸發每分鐘限流。

### 2. Cron 工作（依排程或「下次 heartbeat」觸發）

目前你有例如：

- **Daily OpenClaw Memory Backup**：每 24h，`wakeMode: next-heartbeat` → 在「下一次 heartbeat」時一併執行。
- **Daily Token Usage Alert**：每天 0:00（Asia/Taipei），`wakeMode: next-heartbeat` → 同樣綁在 heartbeat。
- 其他每週任務（ClawHub 更新、清理暫存、整理 MEMORY 等）依排程或設定觸發。

這些**每次執行都會跑 agent、用主模型**，所以也會算進 Gemini 用量。

---

## 三、為何會 429 / 額度感覺被吃完

- **Heartbeat 每 30 分鐘**就呼叫一次主模型，是持續且穩定的請求來源。
- 再加上：你從 Telegram 的對話、cron 觸發的任務、可能的多輪與重試，**累積起來**容易：
  - 觸發 **每分鐘請求數（RPM）** 限制 → 429
  - 或讓免費／低額度方案的**每日用量**很快用完。

所以：**不是任務板在讓 OpenClaw 一直執行，而是 OpenClaw 自己的 heartbeat（與綁在 heartbeat 上的 cron）在定期呼叫主模型。**

---

## 四、建議做法

1. **主模型改成本機（你已做）**  
   維持 `primary: ollama/qwen2.5:14b`，heartbeat 與 cron 就改吃本機，不再打 Gemini。

2. **若想再開 Gemini 當主模型**  
   - **選項 A**：把 `~/.openclaw/workspace/HEARTBEAT.md` 清空或只留註解（`#` 開頭、空行）。  
     OpenClaw 會判定「無實質內容」而**跳過 heartbeat 的 API 呼叫**，可大幅減少自動請求。
   - **選項 B**：查 OpenClaw 是否支援調長 heartbeat 間隔（例如改為 2h、6h），降低呼叫頻率。

3. **確認 cron 需求**  
   若不需要「每日記憶備份」「每日 Token 提醒」等，可在 OpenClaw 裡停用或刪除對應 cron，減少觸發次數。

---

## 五、快速對照

- **任務板 n8n 每 5 分鐘 run-next** → 只動任務板狀態，**不會**讓 OpenClaw / Gemini 一直跑。
- **OpenClaw heartbeat 每 30 分鐘** → **會**一直用主模型，是主要自動消耗來源。
- **OpenClaw cron** → 觸發時會用主模型，頻率較低但會疊加在 heartbeat 上。

若之後要再以 Gemini 當主模型，建議至少做「HEARTBEAT.md 清空或只留註解」或拉長 heartbeat 間隔，避免不知不覺把額度或 RPM 用完。
