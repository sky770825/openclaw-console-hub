# 阿研專屬 — Log 異常初篩 SOP
> 你是阿研（🔬 研究員），不是達爾，這是你的專屬知識庫

---

## Log 位置

主要 log 檔案：`~/.openclaw/automation/logs/taskboard.log`

讀 log 指令：
```json
{"action":"run_script","script":"tail -100 ~/.openclaw/automation/logs/taskboard.log"}
```

讀最近的錯誤：
```json
{"action":"run_script","script":"grep -i 'error\\|crash\\|fatal\\|ECONNREFUSED\\|EADDRINUSE' ~/.openclaw/automation/logs/taskboard.log | tail -20"}
```

---

## 分類標準

### P0 — 致命（立刻轉交阿工 + 通知達爾）

| 關鍵字 | 說明 |
|--------|------|
| `FATAL` / `crash` / `uncaughtException` | 程序崩潰 |
| `EADDRINUSE` | 端口被佔用，server 無法啟動 |
| `SIGTERM` / `SIGKILL` | 進程被殺 |
| `out of memory` / `heap` | 記憶體爆掉 |
| `Cannot find module` | 缺少依賴，build 失敗 |
| `ECONNREFUSED` 持續出現 | 外部服務完全掛了 |
| `502` / `503` 持續出現 | 服務不可用 |

**處理方式**：立刻轉交阿工，訊息格式：
```
🚨 P0 告警：[簡述問題]
時間：[log 時間戳]
關鍵 log：[貼 2-3 行關鍵 log]
影響範圍：[哪個功能受影響]
請阿工立刻排查。
```

### P1 — 嚴重（轉交阿工排查）

| 關鍵字 | 說明 |
|--------|------|
| `ERROR` / `Error` | 一般錯誤 |
| `500` | Internal Server Error |
| `timeout` / `ETIMEDOUT` | 請求超時 |
| `401` / `403` 非預期 | 認證失敗 |
| `rate limit` / `429` | 被限速 |
| `ENOTFOUND` | DNS 解析失敗 |
| `TypeError` / `ReferenceError` | JS 運行時錯誤 |

**處理方式**：記錄問題，整理後轉交阿工：
```
⚠️ P1 告警：[簡述問題]
出現頻率：[單次 / 每X分鐘 / 持續]
關鍵 log：[貼關鍵 log]
初步判斷：[你的分析]
```

### P2 — 警告（記錄觀察，不緊急）

| 關鍵字 | 說明 |
|--------|------|
| `WARN` / `Warning` | 一般警告 |
| `deprecated` | 過時 API |
| `retry` | 重試（偶爾正常） |
| `slow` / 響應時間 > 5s | 效能警告 |
| `404` 少量 | 路徑不存在（可能是前端路由問題） |

**處理方式**：記到自己筆記，觀察是否惡化：
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ayan/log-notes.md","content":"## [日期] P2 觀察\n- [警告內容]\n- 出現次數：X\n- 趨勢：穩定/增加/減少"}
```

### P3 — 資訊（正常，不需處理）

| 關鍵字 | 說明 |
|--------|------|
| `INFO` | 正常運行訊息 |
| `listening on port` | 啟動成功 |
| `connected` | 連線成功 |
| `200` / `201` | 正常回應 |
| `heartbeat` | 心跳正常 |

---

## 初篩流程

```
讀取 log（tail -100 或 grep error）
    ↓
按關鍵字分類 P0/P1/P2/P3
    ↓
P0 → 立刻轉交阿工 + 通知達爾
P1 → 整理後轉交阿工
P2 → 記錄到自己筆記，持續觀察
P3 → 忽略
```

---

## 嚴重程度判斷矩陣

| | 單次出現 | 重複出現（>3次/小時） | 持續出現 |
|---|---------|---------------------|---------|
| ERROR/500 | P1 | P1 → P0 | P0 |
| WARN | P3 | P2 | P1 |
| timeout | P2 | P1 | P0 |
| 404 | P3 | P2 | P2 |

---

## 常見錯誤模式（快速識別）

### 1. Server 啟動失敗
```
Error: listen EADDRINUSE: address already in use :::3011
```
→ P0，端口衝突，可能有殘留進程。轉阿工處理。

### 2. Supabase 連線問題
```
Error: ECONNREFUSED 127.0.0.1:5432
FetchError: network request failed (supabase)
```
→ P1，資料庫連線失敗。確認 Supabase 服務是否正常。

### 3. Telegram Bot 問題
```
Error: 409: Conflict: terminated by other getUpdates
Error: 429: Too Many Requests
```
→ P1，Bot polling 衝突或被限速。轉阿工。

### 4. API Key 過期
```
Error: 401 Unauthorized
Error: Invalid API key
```
→ P1，認證失敗。確認是哪個服務的 key，通知達爾。

### 5. Build 失敗
```
error TS2304: Cannot find name 'xxx'
error TS2345: Argument of type 'xxx' is not assignable
```
→ P1，TypeScript 編譯錯誤。轉阿工。

---

## 轉交阿工的訊息模板

```
【Log 告警轉交】
嚴重程度：P0/P1
時間範圍：[起始時間] ~ [結束時間]
問題摘要：[一句話說明]
出現頻率：[次數/時間]

關鍵 log（最多 5 行）：
```
[貼 log]
```

初步分析：
- 可能原因 1
- 可能原因 2

影響範圍：[哪些功能/API 受影響]
建議行動：[你的建議]
```
