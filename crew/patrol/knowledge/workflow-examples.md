# 巡查官工作流範例集
> **你是巡查官（patrol）。** 這是你的專屬工作流範例。

---

## 工作流 1：定時巡查（每 15 分鐘）

**場景**：定時掃描系統狀態，找出異常。

### Step 1：掃描任務表
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status,owner,updated_at","filters":{"status":"running"},"order":"updated_at.asc","limit":50}
```
**成功標準**：拿到所有 running 任務，檢查有沒有超時（running 超過 2 小時）。

### Step 2：掃描失敗任務
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status,owner,updated_at","filters":{"status":"failed"},"order":"updated_at.desc","limit":20}
```
**成功標準**：找到所有 failed 任務，確認是否已有人處理。

### Step 3：產出巡查報告
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/patrol/reports/巡查報告_[timestamp].md","content":"# 巡查報告 [時間]\n\n## 異常\n- [列出異常]\n\n## 任務摘要\n- running: N\n- failed: N\n- pending: N"}
```

---

## 工作流 2：阻塞偵測與通報

**場景**：發現任務卡住，需要通報。

### Step 1：確認阻塞原因
```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/[owner]/MEMORY.md"}
```

### Step 2：建立追蹤任務
```json
{"action":"create_task","name":"阻塞通報：[任務名] 已卡住 [N] 小時","priority":"high","owner":"ace","description":"巡查發現 [任務名] 超時，建議阿策重新排程"}
```

---

## 工作流 3：交付物驗收

**場景**：任務標記完成，檢查是否有交付物。

### Step 1：查已完成任務
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,owner,updated_at","filters":{"status":"done"},"order":"updated_at.desc","limit":10}
```

### Step 2：檢查交付物
```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/[owner]/notes/[相關檔案]"}
```
**成功標準**：任務有對應的交付物文件。無交付物 → 建任務追蹤。

---

## 誤報過濾指南（False-Positive Filtering）

> 並非所有「看起來卡住」的任務都是真正的異常。巡查前先過濾誤報，避免不必要的通知噪音。

### 原則：「正常處理中」vs「真的卡住了」

判斷一個任務是否異常，需要綜合以下三個訊號：

| 訊號 | 正常處理中 | 真的卡住了 |
|------|-----------|-----------|
| 執行時間 | 在該類型任務的合理時間內 | 超過該類型任務時間上限 |
| 執行日誌 | 近期有新的日誌輸出 | 日誌停止更新超過 15 分鐘 |
| 狀態變化 | 子步驟有推進 | 狀態完全未變 |

### 時間閾值（依任務類型）

| 任務類型 | 正常範圍 | 警告閾值 | 確認卡住 | 範例 |
|----------|---------|---------|---------|------|
| 快速任務（quick） | 0~15 分鐘 | 15 分鐘 | 30 分鐘 | 發送通知、更新狀態、簡單查詢 |
| 一般任務（normal） | 0~45 分鐘 | 45 分鐘 | 1 小時 | 撰寫內容、程式碼修改 |
| 複雜任務（complex） | 0~2 小時 | 2 小時 | 3 小時 | 全面分析、大型重構、多步驟部署 |
| 長時任務（long-running） | 0~6 小時 | 6 小時 | 8 小時 | 模型訓練、大規模資料處理 |

### 過濾流程

```
發現任務超時 →
  Step 1：確認任務類型，查對應閾值
    → 尚未超過警告閾值 → 不處理，下次巡查再看
  Step 2：檢查執行日誌
    → 讀取 agent 的 notes 或 logs
    → 日誌近 15 分鐘有更新 → 可能只是比較慢，標記觀察
    → 日誌完全停止 → 進入 Step 3
  Step 3：檢查狀態變化
    → 比較上次巡查時的狀態快照
    → 有變化 → 標記觀察，下次巡查追蹤
    → 無變化 → 確認卡住，依升級矩陣通報
```

### 常見誤報情境

1. **Agent 正在等待外部 API 回應**：日誌會顯示「等待中」，這是正常的，不要通報
2. **複雜任務拆分為多個子步驟**：整體時間長但每個子步驟都在推進，屬正常
3. **任務剛被指派**：剛進入 running 狀態不到 5 分鐘，不應標記
4. **手動暫停的任務**：狀態為 paused 而非 running，不納入超時計算
