# Phase 2: 安全機制

> 執行者：Cursor（訂閱制）
> 優先級：P1
> 依賴：Phase 1 完成
> 工作目錄：/Users/caijunchang/.openclaw/workspace/scripts/

## 目標
為所有自動化腳本加入熔斷器、預算看門狗、超時保護、緊急停止。

## 任務 1：熔斷器（改造現有腳本）

### 需求
在每個自動化腳本（autopilot-lean.sh, unified-monitor.sh, checkpoint.sh 等）的開頭加入：

```bash
# 熔斷器檢查（加在腳本最前面）
STATE_FILE="$HOME/.openclaw/automation/state.json"
SCRIPT_NAME="autopilot"  # 每個腳本改自己的名字
MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null)

# 檢查緊急停止
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date)] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> ~/.openclaw/automation/logs/automation.log
  exit 0
fi

# 檢查是否啟用
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi

# 檢查連續錯誤次數
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null)
if [ "$errors" -ge "$MAX_ERRORS" ]; then
  echo "[$(date)] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> ~/.openclaw/automation/logs/automation.log
  exit 0
fi
```

### 成功/失敗時更新 state.json
```bash
# 腳本尾部加入
# 成功時：重設錯誤計數
update_state_success() {
  local tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '
    .automations[$name].errors = 0 |
    .automations[$name].lastRun = (now | todate)
  ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# 失敗時：增加錯誤計數
update_state_failure() {
  local tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '
    .automations[$name].errors = ((.automations[$name].errors // 0) + 1) |
    .automations[$name].lastRun = (now | todate)
  ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}
```

### 需要改造的腳本
1. `autopilot-lean.sh` → SCRIPT_NAME="autopilot"
2. `unified-monitor.sh` → SCRIPT_NAME="monitor"
3. `checkpoint.sh` → SCRIPT_NAME="checkpoint"
4. `daily-budget-tracker.sh` → SCRIPT_NAME="budget"
5. `model-cost-tracker.sh` → SCRIPT_NAME="cost-tracker"
6. `openclaw-recovery.sh` → SCRIPT_NAME="recovery"

---

## 任務 2：預算看門狗（升級 daily-budget-tracker.sh）

### 需求
在 `daily-budget-tracker.sh` 加入：
- 讀取 `state.json` 的 `dailyBudget` 值
- 當日花費 >= 80% → 寫警告到日誌
- 當日花費 >= 100% → 自動設定 `emergencyStop=true`，停用所有 AI 任務
- 日誌格式：`[時間] [budget] ⚠️ 已達 80% 預算上限 ($4.00/$5.00)`

---

## 任務 3：超時保護（建立 `run-with-timeout.sh`）

### 需求
通用的超時包裝器：
```bash
./run-with-timeout.sh <秒數> <腳本> [參數]
# 範例
./run-with-timeout.sh 60 ./autopilot-lean.sh
./run-with-timeout.sh 30 ./unified-monitor.sh --quick
```

用 `timeout` 命令（macOS 用 `gtimeout` 或 bash 內建），超時自動 kill + 記錄日誌。

---

## 驗收標準
1. 所有 6 個腳本都有熔斷器檢查
2. `emergencyStop=true` 時所有腳本跳過執行
3. 連續錯誤 >= 5 時自動熔斷
4. 預算 80% 有警告、100% 自動停止
5. `run-with-timeout.sh` 能正確超時終止
