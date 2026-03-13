# CONFIG-SELF-CORRECTION: 設定檔每日自我校正機制

> 影片 10 對應優化：每日自動比對設定檔一致性

---

## 1. 現有 sync-review.sh 功能說明

**路徑:** `~/.openclaw/workspace/prompts/sync-review.sh`

現有腳本負責比對 Prompt 版本一致性：
- 比對根目錄（Claude 版）與 `local-models/`（本地模型版）的核心事實檔案
- 檢查 `AGENTS.md`、`SOUL.md`、`IDENTITY.md` 三個核心檔案
- 透過關鍵詞 grep 提取核心事實，計算事實數量差異比
- 差異超過 50% 標記為 drift
- 結果寫入 `sync-history.jsonl`

**限制：**
- 只檢查 prompt 檔案，不涵蓋系統設定檔
- 無法偵測檔案權限異常或意外新增檔案
- 無 sha256 完整性校驗

---

## 2. 建議的 Cron 排程

**排程時間:** 每日 02:00 CST（Asia/Taipei）

```
0 2 * * *    Asia/Taipei
```

分為兩階段執行：
1. **02:00** — `sync-review.sh`（Prompt 版本同步檢查）
2. **02:05** — `config-integrity-check.sh`（設定檔完整性檢查）

---

## 3. 擴充功能建議

### 3.1 設定檔一致性檢查
- 比對 `~/.openclaw/openclaw.json` 與 `~/.openclaw/config.json` 的 sha256
- 與上次已知良好快照比對，偵測意外變更
- 備份目錄中的設定檔作為基準參考

### 3.2 檔案權限變更偵測
- 記錄核心設定檔的權限基線（如 600 / 644）
- 每日比對是否有非預期的權限放寬（例如 644 變 777）
- 特別關注含有 credentials 的檔案

### 3.3 意外新增檔案偵測
- 快照 `~/.openclaw/` 根目錄的檔案清單
- 比對前次快照，標記所有新增或刪除的檔案
- 排除已知的動態目錄（logs/、backups/、cron/runs/）

### 3.4 每日校正報告
- 以 JSONL 格式寫入 `~/.openclaw/logs/integrity-check.jsonl`
- 每筆記錄包含：timestamp、status、checks 明細、workspace 大小

---

## 4. 如何添加到 OpenClaw 的 Cron 系統

在 `~/.openclaw/cron/jobs.json` 的 `jobs` 陣列中新增以下項目：

```json
{
  "id": "config-integrity-daily",
  "agentId": "main",
  "name": "Daily Config Integrity Check",
  "enabled": true,
  "schedule": {
    "kind": "cron",
    "expr": "5 2 * * *",
    "tz": "Asia/Taipei"
  },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "systemEvent",
    "text": "執行每日設定檔完整性校正：bash ~/.openclaw/workspace/optimizations/config-integrity-check.sh"
  },
  "delivery": {
    "mode": "announce"
  }
}
```

**啟用步驟：**
1. 將上述 JSON 加入 `jobs.json` 的 `jobs` 陣列
2. 確認 `config-integrity-check.sh` 已設為可執行（`chmod +x`）
3. 首次手動執行一次以建立基線快照
4. 確認報告正確產出到 `~/.openclaw/logs/integrity-check.jsonl`

---

## 5. 相關檔案

| 檔案 | 用途 |
|------|------|
| `~/.openclaw/workspace/prompts/sync-review.sh` | Prompt 版本同步審查 |
| `~/.openclaw/workspace/optimizations/config-integrity-check.sh` | 設定檔完整性校正腳本 |
| `~/.openclaw/logs/integrity-check.jsonl` | 校正報告輸出 |
| `~/.openclaw/openclaw.json` | OpenClaw 主設定檔 |
| `~/.openclaw/config.json` | 系統設定檔 |
| `~/.openclaw/cron/jobs.json` | Cron 排程定義 |
