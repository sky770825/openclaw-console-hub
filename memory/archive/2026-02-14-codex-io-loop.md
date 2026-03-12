# Subagent I/O 閉環模式（正式版 v2.1）

> 建立日期: 2026-02-14
> 最後更新: 2026-02-14 02:31
> 版本: v2.1（新增 Cursor 規則、idempotency key、自動升級機制）
> 適用對象: Codex、Cursor Agent 等所有 subagent

---


## 0) 本文件定位（SSoT）

- **規範唯一真相（SSoT）**：`memory/2026-02-14-codex-cursor-io-loop.md`
  - 內含：`projects/<project>/modules/<module>/` 結構、`run_path/RESULT.md` 交付規範、任務卡寫回欄位、回報分層（防爆 context）、小ollama 回報格式 v2、最短派工指令。
- **本文件定位**：保留「Subagent 閉環原則/升級條件/idempotency」等通用治理；若與 SSoT 衝突，以 SSoT 為準。

### 落地硬規則（摘要版，完整規則見 SSoT）

- **專案唯一真相**：`projects/<project>/modules/<module>/`
- **執行輸出路徑**：`projects/<project>/runs/<YYYY-MM-DD>/<run_id>/`
- **DoD**：每次執行必產出 `run_path/RESULT.md`（commands/acceptance/rollback/summary）
- **回報分層**：Telegram 只回索引級（task_id/run_id/project_path/run_path + 短摘要/nextSteps），全量內容寫入 `RESULT.md` + `ARTIFACTS/`
- **Telegram token**：同一 bot token 只能有一個 getUpdates poller；小蔡 bot 與小ollama bot 必須分離，避免 `409 getUpdates conflict`

---

## 1) 流程定義

### 通用流程（Codex + Cursor）
```
老蔡下指令 → 小蔡生成 task_id + run_id → 小蔡啟動 Subagent 
    ↓
Subagent 執行（檢查 idempotency_key = task_id:run_id）
    ↓
Subagent 回報（【小蔡執行-TASK_NAME】task_id / run_id / status）
    ↓
老蔡 ACK（收到了/沒收到）
    ↑_________(自動升級機制：2x timeout 或 3x failed)_____↓
        若符合升級條件 → [ESCALATE_Codex/Cursor] 立即升級
```

**小蔡角色：** 不參與內容回覆，只做調度/監控/升級/idempotency 檢查

---

## 2) 角色邊界

| 角色 | 職責 | 不做的 |
|------|------|--------|
| **小蔡** | 任務分派、task_id 生成、run_id 生成、狀態監控、異常升級、idempotency 檢查 | 不加工結果、不當回覆窗口 |
| **Codex** | 搜尋/查詢、多工具鏈整合、後端修復、大型多步驟任務、系統分析 | UI/前端微調 |
| **Cursor** | 程式執行、修改、驗證、UI/前端微調、現有專案改碼、代碼審查 | 複雜系統故障排查 |
| **小ollama** | 結果通知（成功/失敗/摘要） | 不執行複雜分析 |
| **老蔡** | ACK 確認（收到了/沒收到）、決策、升級確認 | - |

---

## 3) 任務分配策略

### 決策樹（帶 task_id + run_id 生成）
```
老蔡下指令
    ↓
小蔡生成: TASK_ID=$(date +task_%s_name), RUN_ID=$RANDOM
    ↓
├─ UI/前端微調、現有專案改碼 → Cursor Agent 優先
├─ 系統故障排查、後端修復 → Codex 優先
├─ 多工具鏈整合、搜尋/查詢 → Codex 優先
├─ 大型多步驟任務 → Codex 主導，Cursor 做子任務
├─ 定時監控報告 → Codex/Cursor（依任務類型）
└─ < 30 秒能做完？ → 小蔡本地處理（省啟動費）
```

### Cursor Agent 專用規則
| 場景 | 推薦 | 說明 |
|------|------|------|
| 程式改碼 | **Cursor** | IDE 整合，改碼快速 |
| 代碼審查 | **Cursor** | 能理解上下文，提意見 |
| UI 改進 | **Cursor** | 前端調整能力強 |
| 專案重構 | **Cursor** | 整個檔案改動靈活 |
| 實驗性改動 | **Cursor** | 易於回滾與測試 |

### 角色分工細節

| 任務類型 | 推薦 Agent | 原因 |
|---------|-----------|------|
| 前端元件修改 | **Cursor** | IDE 整合，程式修改高效 |
| API 端點修復 | **Cursor/Codex** | 兩者皆可，看複雜度 |
| 資料庫遷移 | **Codex** | 需要多步驟驗證 |
| 網路搜尋整理 | **Codex** | web_search 工具 |
| 系統健康檢查 | **Codex** | 多工具整合 |
| Refactor 重構 | **Cursor** | 程式理解與修改 |
| Debug 除錯 | **Cursor** | 堆疊追蹤與修復 |

---

## 4) Idempotency 與防重複（v2.1 新增）

### Idempotency Key 定義
```bash
IDEMPOTENCY_KEY="${TASK_ID}:${RUN_ID}"
# 例: task_1771007460_external-intel:run_2861
```

### 使用場景
1. **Subagent 收到任務時檢查**
   ```bash
   if grep -q "${IDEMPOTENCY_KEY}" ~/.openclaw/automation/processed_tasks.log; then
     echo "已處理過，跳過"
     exit 0
   fi
   ```

2. **任務重試時**
   - 首次執行：RUN_ID = $RANDOM
   - 重試執行：同一 TASK_ID，但 RUN_ID 遞增（run_2861 → run_2862）
   - 防止重複執行同一邏輯

3. **記錄處理狀態**
   ```bash
   echo "${IDEMPOTENCY_KEY}|success|timestamp" >> ~/.openclaw/automation/processed_tasks.log
   ```

---

## 5) 自動升級機制（v2.1 新增）

### 升級條件（任一成立立即執行）
```
連續 2 次 timeout   → [ESCALATE_Codex/Cursor]
連續 3 次 failed    → [ESCALATE_Codex/Cursor]
(不再重試)
```

### 升級流程
```
Subagent 失敗 → 小蔡記錄狀態（timeout/failed）
    ↓
檢查連續失敗次數 (stored in ~/.openclaw/automation/task_failures.json)
    ↓
├─ 2x timeout / 3x failed → [ESCALATE_Codex] 發送給我
└─ 其他情況 → 等待老蔡 ACK
```

### 升級通知格式
```
【ESCALATE_Codex】
task_id: task_1771007460_external-intel
consecutive_failures: 2 (timeout) | 3 (failed)
last_error: [錯誤摘要]
recommendation: [升級建議]
action: 已停止重試，等待人工介入
```

---

## 6) 安全規則（必做）

### Token 管理
- ❌ **禁止**：Telegram Bot Token 寫死在訊息/腳本
- ✅ **正確**：全部走環境變數
  ```bash
  export TELEGRAM_BOT_TOKEN="your_token_here"
  export TELEGRAM_CHAT_ID="5819565005"
  ```

### Token 旋轉（Rotation）
- 若 token 疑似外洩：
  1. 立即在 Telegram @BotFather 產生新 token
  2. 舊 token 作廢（自動失效）
  3. 更新環境變數
  4. 重新啟動相關服務

### 敏感資訊處理
- 使用 `$(echo $VAR)` 而非直接寫值
- Log 中過濾 token
- 定期檢查 session transcripts

---

## 5) ACK 與補發機制

### 正常流程
1. Subagent 發送完成訊息（小ollama 身份）
2. 老蔡回覆 **「收到了」** → 任務結束
3. 老蔡靜默或回覆 **「沒收到」** → 進入補發

### 補發規則
```
首次發送 → 等待 3 分鐘 → 未 ACK → 自動補發 1 次（retry=1）
    ↓
補發後等待 3 分鐘 → 仍未 ACK → 觸發告警（但不重跑任務）
```

### 重要限制
- **retry 只重發通知**，不重跑執行
- 避免重複操作造成副作用

---

## 6) Idempotency（防重複）

### 必帶欄位
每個任務必須包含：
```bash
TASK_ID="task_$(date +%s)_$$"      # 任務唯一識別
RUN_ID="run_${RANDOM}"              # 執行次數識別
```

### 冪等實作
```bash
# 檢查是否已處理
if grep -q "${TASK_ID}:${RUN_ID}" /tmp/processed_tasks 2>/dev/null; then
  echo "已處理過，跳過"
  exit 0
fi

# 執行任務...

# 記錄已處理
echo "${TASK_ID}:${RUN_ID}" >> /tmp/processed_tasks
```

---

## 7) 統一回報格式（v2.1 更新：必含 run_id）

### 成功格式
```
【小蔡執行-${TASK_NAME}】
task_id: task_1771007460_external-intel
run_id: run_2861
status: success
retry: 0|1
time: YYYY-MM-DD HH:mm:ss
summary: |
  執行結果摘要（50-100字）
  關鍵數據：A=xxx, B=yyy
✅ 任務完成
```

### 失敗格式
```
【小蔡執行-${TASK_NAME}】
task_id: task_1771007460_external-intel
run_id: run_2861
status: failed|timeout
retry: 0|1
time: YYYY-MM-DD HH:mm:ss
summary: 任務執行失敗
error: |
  錯誤類型: xxx
  錯誤訊息: xxx
  建議: xxx
consecutive_failures: 1/2|1/3
❌ 執行失敗
```

**必填欄位：**
- ✅ task_id
- ✅ run_id （**v2.1 新增**）
- ✅ status
- ✅ time
- ✅ summary
- ✅ consecutive_failures（失敗時必填，用於升級判斷）

---

## 8) Cursor 專用規則（v2.1 新增）

### Cursor Agent 與 Codex 的區別

| 維度 | Codex | Cursor |
|------|-------|--------|
| **強項** | 搜尋、分析、多工具整合 | 程式改碼、整合修改 |
| **回報風格** | 詳細分析 + 建議 | 實做結果 + PR/commit |
| **失敗重試** | 可嘗試替代搜尋/方案 | 改碼方案固定，失敗需升級 |
| **超時處理** | 考慮分段執行 | 考慮問題拆解 |

### Cursor 自動升級條件（更嚴格）
```
連續 1 次 syntax error   → [ESCALATE_Cursor]（代碼問題嚴重）
連續 2 次 test failed    → [ESCALATE_Cursor]（改動有問題）
連續 2 次 timeout        → [ESCALATE_Cursor]（性能問題）
連續 3 次 git conflict   → [ESCALATE_Cursor]（改動衝突）
```

---

## 9) 成本策略

### Token 價格（Kimi k2.5）
| 類型 | 價格/1k tokens |
|------|---------------|
| **Input** | ~$0.0005 |
| **Output** | ~$0.0015（3x） |

### 成本參考
| 任務 | 總計 | 台幣 |
|------|------|------|
| 啟動成本 | 6k | ~$0.12（固定） |
| 簡單搜尋 | 10k | ~$0.20 |
| 程式修改 | 15k | ~$0.30 |
| 深度分析 | 20k+ | ~$0.40+ |

### 省錢原則
- ✅ 工具導向（Input 為主）→ 便宜
- ❌ 生成導向（Output 多）→ 貴 3 倍
- ✅ 老蔡主動 ACK → 小蔡不讀 transcript → 省 30-40%

---

## 10) 標準任務模板（v2.1 更新）

```bash
#!/bin/bash
# 【小蔡執行-${TASK_NAME}】

# === 設定區（環境變數）===
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-5819565005}"
TASK_NAME="任務名稱"

# === 冪等識別 (v2.1) ===
TASK_ID="${TASK_ID:-task_$(date +%s)_$(basename $0 .sh)}"
RUN_ID="${RUN_ID:-run_$RANDOM}"
IDEMPOTENCY_KEY="${TASK_ID}:${RUN_ID}"
RETRY_COUNT="${RETRY_COUNT:-0}"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"
PROCESSED_LOG="${HOME}/.openclaw/automation/processed_tasks.log"

# === 防重複檢查 (v2.1) ===
if grep -q "^${IDEMPOTENCY_KEY}|" "${PROCESSED_LOG}" 2>/dev/null; then
  echo "已處理（IDEMPOTENCY_KEY: ${IDEMPOTENCY_KEY}），跳過"
  exit 0
fi

# === 執行任務 ===
# [任務邏輯]
EXEC_STATUS="success"  # success|failed
EXEC_RESULT="結果摘要"
EXEC_ERROR=""

# === 訊息組裝 (v2.1) ===
if [ "$EXEC_STATUS" = "success" ]; then
  MSG_TEXT="【小蔡執行-${TASK_NAME}】
task_id: ${TASK_ID}
run_id: ${RUN_ID}
status: success
retry: ${RETRY_COUNT}
time: ${NOW}
summary: ${EXEC_RESULT}
✅ 任務完成"
  
  # 記錄成功（idempotency_key + status + timestamp）
  echo "${IDEMPOTENCY_KEY}|success|${NOW}" >> "${PROCESSED_LOG}"
  
else
  # 失敗時記錄連續失敗次數
  FAILURE_COUNT=$(grep "^${TASK_ID}" "${PROCESSED_LOG}" 2>/dev/null | grep -c "failed\|timeout" || echo "0")
  FAILURE_COUNT=$((FAILURE_COUNT + 1))
  
  MSG_TEXT="【小蔡執行-${TASK_NAME}】
task_id: ${TASK_ID}
run_id: ${RUN_ID}
status: ${EXEC_STATUS:-failed}
retry: ${RETRY_COUNT}
time: ${NOW}
summary: 失敗
error: ${EXEC_ERROR}
consecutive_failures: ${FAILURE_COUNT}
❌ 執行失敗"
  
  # 記錄失敗
  echo "${IDEMPOTENCY_KEY}|${EXEC_STATUS:-failed}|${NOW}" >> "${PROCESSED_LOG}"
  
  # (v2.1) 檢查升級條件
  if [ "$FAILURE_COUNT" -ge 2 ]; then
    echo "[ESCALATE_Codex] 連續失敗 ${FAILURE_COUNT} 次，升級處理"
    ESCALATE=1
  fi
fi

# === 發送通知 ===
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  curl -sS --fail-with-body \
    --connect-timeout 5 --max-time 30 \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${MSG_TEXT}"
else
  echo "錯誤: TELEGRAM_BOT_TOKEN 未設定" >&2
  exit 1
fi

# === 升級條件判斷 ===
if [ "${ESCALATE:-0}" -eq 1 ]; then
  echo "[ESCALATE_${AGENT_TYPE:-Codex}] 自動升級，停止重試"
  exit 1
fi
```

---

## 11) 版本紀錄

### v2.1 (2026-02-14 02:31) - Cursor + Idempotency + Escalation
- ✅ 新增 run_id 必填規則
- ✅ 新增 idempotency_key 定義與檢查
- ✅ 新增自動升級機制（2x timeout / 3x failed）
- ✅ 新增 Cursor 專用規則與升級條件
- ✅ 更新標準任務模板

### v2.0 (2026-02-14) - 初版
- 角色邊界定義
- 任務分配決策樹
- 安全規則
- ACK 補發機制

---

## 12) 相關檔案

- **本文件**: `memory/2026-02-14-codex-io-loop.md` (主規則檔)
- **記錄位置**: `~/.openclaw/automation/processed_tasks.log` (idempotency 記錄)
- **失敗追蹤**: `~/.openclaw/automation/task_failures.json` (升級條件記錄)
- **MEMORY.md**: 快速參考
- **Git-Notes**: 標籤 `subagent`, `io-loop`, `codex`, `cursor`, `idempotency`, `escalation`

---

🐣 小蔡 | 2026-02-14 建立
✏️ 2026-02-14 02:31 更新（v2.1：Cursor 規則、Idempotency、自動升級）
