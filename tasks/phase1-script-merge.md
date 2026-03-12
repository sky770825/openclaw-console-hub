# Phase 1: 腳本合併與統一控制器

> 執行者：Cursor（訂閱制）
> 優先級：P0
> 工作目錄：/Users/caijunchang/.openclaw/workspace/scripts/

## 目標
建立 `automation-ctl.sh` 統一控制器 + `context-manager.sh` 合併腳本

## 任務 1：建立 `automation-ctl.sh`

統一控制所有自動化腳本的開關、狀態、日誌查看。

### 功能需求
```bash
./automation-ctl.sh status              # 顯示所有自動化狀態（讀 state.json）
./automation-ctl.sh enable <name|all>   # 啟用自動化（寫 state.json）
./automation-ctl.sh disable <name|all>  # 停用自動化（寫 state.json）
./automation-ctl.sh run <name> [args]   # 單次觸發執行
./automation-ctl.sh logs <name> [--tail N]  # 查看日誌
./automation-ctl.sh health             # 健康檢查總覽
```

### 狀態檔位置
`~/.openclaw/automation/state.json`（已存在，結構如下）：
```json
{
  "automations": {
    "autopilot": { "enabled": true, "lastRun": null, "errors": 0 },
    "monitor": { "enabled": true, "lastRun": null, "errors": 0 },
    "checkpoint": { "enabled": true, "lastRun": null, "errors": 0 },
    "budget": { "enabled": true, "lastRun": null, "errors": 0 },
    "cost-tracker": { "enabled": true, "lastRun": null, "errors": 0 },
    "recovery": { "enabled": true, "lastRun": null, "errors": 0 }
  },
  "emergencyStop": false,
  "dailyBudget": 5.00,
  "maxConsecutiveErrors": 5
}
```

### 自動化名稱 → 對應腳本
| name | 腳本 |
|------|------|
| autopilot | autopilot-lean.sh |
| monitor | unified-monitor.sh |
| checkpoint | checkpoint.sh |
| budget | daily-budget-tracker.sh |
| cost-tracker | model-cost-tracker.sh |
| recovery | openclaw-recovery.sh |

### 日誌目錄
`~/.openclaw/automation/logs/`

### 實作要求
- 純 bash，不依賴 Node/Python
- 用 jq 讀寫 state.json
- status 輸出要有顏色（綠=enabled, 紅=disabled）
- disable all 要同時設定 emergencyStop=true
- enable all 要同時設定 emergencyStop=false

---

## 任務 2：建立 `context-manager.sh`

合併 context 相關功能為一個帶子命令的腳本。

### 功能需求
```bash
./context-manager.sh --auto    # 自動模式：檢查 context 使用量，超過 70% 建議 compact
./context-manager.sh --check   # 只檢查，不做動作
./context-manager.sh --report  # 輸出詳細報告
```

### 實作要求
- 純 bash
- 檢查 OpenClaw session 的 context window 使用狀態
- 寫日誌到 `~/.openclaw/automation/logs/context.log`
- --auto 模式超過閾值時寫入警告到日誌

---

## 驗收標準
1. `./automation-ctl.sh status` 正確顯示所有自動化狀態
2. `./automation-ctl.sh disable autopilot` 成功更新 state.json
3. `./automation-ctl.sh enable all` 重設所有為 enabled
4. `./context-manager.sh --auto` 能執行不報錯
5. 所有腳本有 `chmod +x`
