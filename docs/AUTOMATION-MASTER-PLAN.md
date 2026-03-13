# 自動化總體規劃 — Automation Master Plan

> 規劃人：達爾（Opus 4.6）| 日期：2026-02-13
> 執行指揮：Kimi K2.5 | 開發人員：Cursor / CoDEX

---

## 一、現有腳本全盤點（37 個）

### 分類整理

#### ✅ 保留並升級（核心腳本）
| 腳本 | 功能 | 改進項 |
|------|------|--------|
| `autopilot-lean.sh` | 零 token Autopilot | 加入安全機制、日誌 |
| `unified-monitor.sh` | 統一監控 | 作為監控入口，整合所有子監控 |
| `task-board-api.sh` | 任務板 CLI | 加入認證 header |
| `checkpoint.sh` | Context 檢查點 | 正常運作，保留 |
| `memfw-scan.sh` | 記憶安全掃描 | 正常運作，保留 |
| `memory_recall.js` | 記憶檢索 | 正常運作，保留 |
| `file-search.sh` | 檔案搜尋 | 正常運作，保留 |
| `daily-budget-tracker.sh` | 預算追蹤 | 加入自動告警 |
| `model-cost-tracker.sh` | 成本追蹤 | 整合到儀表板 |
| `openclaw-recovery.sh` | 自救腳本 | 關鍵！加入自動觸發 |
| `opus-task.sh` | Opus 任務管理 | 保留 |

#### 🔀 合併（功能重複）
| 合併前 | 合併後 | 說明 |
|--------|--------|------|
| `agent-monitor-local.sh` + `agent-monitor-ollama.sh` + `sub-agent-monitor.sh` + `dashboard-monitor.sh` | `unified-monitor.sh` | 已有統一版，刪除舊版 |
| `context-monitor.sh` + `context-auto-compact.sh` + `context-audit.sh` | `context-manager.sh` | 合併為一個帶子命令的腳本 |
| `switch-model.sh` + `use-gemini-flash.sh` + `use-gemini-pro.sh` + `use-kimi.sh` | `switch-model.sh` | 保留通用版，刪快捷版 |
| `autopilot-cycle.sh` | 刪除 | 已被 `autopilot-lean.sh` 取代 |

#### 🗑️ 歸檔或刪除
| 腳本 | 原因 |
|------|------|
| `agent-bus.sh` | AMBP 架構已棄用 |
| `codex-connector.sh` | CoDEX 連接器未啟用 |
| `cursor-connector.sh` | Cursor 連接器未啟用 |
| `taskboard-listener.sh` | AMBP 監聽器已棄用 |
| `send-to-cursor.sh` | 座標點擊方式不穩定 |
| `get-cursor-chat-coordinates.sh` | 配合上一個 |
| `ask-cursor-cli.sh` | Cursor CLI 方式 |
| `openclaw-cursor-rescue.sh` | 整合進 recovery |
| `apply-openclaw-security-fixes.sh` | 一次性腳本，已執行 |
| `setup-dar-ideas.sh` | 一次性設定腳本 |
| `batch-add-dar-ideas.sh` | 一次性批次腳本 |
| `test_model_switch_with_retry.py` | 測試腳本 |
| `restore-skill.sh` | 偶爾用，移到 utils/ |

---

## 二、自動化控制中心架構

### 設計原則
```
所有自動化 = OpenClaw Cron + Bash 腳本
不用 AI 做監控，AI 只做決策
```

### 控制層級

```
┌─────────────────────────────────────────┐
│         OpenClaw Gateway (Cron)          │  ← 排程中心
├─────────────────────────────────────────┤
│  scripts/automation-ctl.sh              │  ← 統一開關控制器
├─────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 監控類   │ │ 維護類   │ │ 業務類  │ │
│  │----------│ │----------│ │---------│ │
│  │ unified  │ │ checkpoint│ │autopilot│ │
│  │ monitor  │ │ context  │ │ budget  │ │
│  │ recovery │ │ cleanup  │ │ cost    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────┤
│         安全機制層（看門狗）              │
│  - 超時自動停止                          │
│  - 預算上限告警                          │
│  - 錯誤次數熔斷                          │
│  - 緊急停止開關                          │
└─────────────────────────────────────────┘
```

---

## 三、統一控制器設計：`automation-ctl.sh`

### 功能
```bash
# 查看所有自動化狀態
./automation-ctl.sh status

# 開關控制
./automation-ctl.sh enable autopilot
./automation-ctl.sh disable monitor
./automation-ctl.sh enable all
./automation-ctl.sh disable all     # 緊急停止

# 單次觸發
./automation-ctl.sh run monitor --quick
./automation-ctl.sh run autopilot

# 查看日誌
./automation-ctl.sh logs monitor --tail 50

# 健康檢查
./automation-ctl.sh health
```

### 狀態檔
```json
// ~/.openclaw/automation/state.json
{
  "automations": {
    "autopilot": { "enabled": true, "lastRun": "...", "errors": 0 },
    "monitor": { "enabled": true, "lastRun": "...", "errors": 0 },
    "checkpoint": { "enabled": true, "lastRun": "...", "errors": 0 },
    "budget": { "enabled": true, "lastRun": "...", "errors": 0 },
    "cost-tracker": { "enabled": true, "lastRun": "...", "errors": 0 },
    "recovery": { "enabled": true, "lastRun": "...", "errors": 0 }
  },
  "emergencyStop": false,
  "dailyBudget": 5.00,
  "maxConsecutiveErrors": 5
}
```

---

## 四、排程設定（OpenClaw Cron）

| 自動化 | 頻率 | 類型 | 模型成本 |
|--------|------|------|----------|
| **autopilot-lean** | 每 5 分鐘 | bash systemEvent | $0 |
| **unified-monitor --quick** | 每 10 分鐘 | bash systemEvent | $0 |
| **unified-monitor --detailed** | 每 1 小時 | bash systemEvent | $0 |
| **checkpoint** | 每 30 分鐘 | bash systemEvent | $0 |
| **budget-tracker** | 每 1 小時 | bash systemEvent | $0 |
| **cost-tracker** | 每 1 小時 | bash systemEvent | $0 |
| **recovery --check** | 每 15 分鐘 | bash systemEvent | $0 |
| **context-manager --auto** | 每 20 分鐘 | bash systemEvent | $0 |
| **cleanup（舊 session）** | 每天 3:00 | bash systemEvent | $0 |
| **daily-report** | 每天 22:00 | isolated agentTurn | kimi（唯一花費） |

**總成本：除了每日報告用 kimi 外，其餘全部 $0**

---

## 五、安全機制

### 1. 熔斷器（Circuit Breaker）
```
每個自動化獨立計數連續錯誤
連續失敗 >= 5 次 → 自動停用該自動化
寫入日誌 + 發 Telegram 告警
```

### 2. 預算看門狗
```
daily-budget-tracker.sh 每小時檢查
當日花費 >= $4（80%）→ 警告
當日花費 >= $5（100%）→ 自動停用所有 AI 任務
只保留 bash 監控繼續運行
```

### 3. 緊急停止
```bash
# 方式 1：命令列
./automation-ctl.sh disable all

# 方式 2：Telegram 指令
/stop_all

# 方式 3：安全檔案
touch ~/.openclaw/EMERGENCY_STOP
# 所有腳本啟動時先檢查此檔案
```

### 4. 超時保護
```
每個腳本設定最大執行時間
autopilot: 60 秒
monitor: 30 秒
recovery: 120 秒
超時自動 kill + 記錄
```

### 5. 日誌集中
```
所有自動化日誌 → ~/.openclaw/automation/logs/
按日分割：automation-2026-02-13.log
格式：[時間] [自動化名] [狀態] 訊息
```

---

## 六、任務板 Server 自動啟動

### 方案：macOS launchd

```xml
<!-- ~/Library/LaunchAgents/com.openclaw.taskboard.plist -->
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.openclaw.taskboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/sky770825/openclaw任務面版設計/server/dist/index.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/sky770825/openclaw任務面版設計/server</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/sky770825/.openclaw/automation/logs/taskboard.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/sky770825/.openclaw/automation/logs/taskboard-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>PORT</key>
    <string>3011</string>
  </dict>
</dict>
</plist>
```

---

## 七、整合任務面板審計

本文件與 `docs/TASK-DASHBOARD-AUDIT.md` 為配套文件：
- **TASK-DASHBOARD-AUDIT.md**：前後端程式碼問題 + UI 改進策略
- **本文件**：腳本自動化 + 控制中心 + 安全機制

兩份合在一起 = **完整的系統升級方案**

---

## 八、執行計畫（交由 Kimi K2.5 指揮）

### Phase 0：清理（立即，30 分鐘）
| 任務 | 指派 | 優先級 |
|------|------|--------|
| 歸檔舊腳本到 scripts/archived/ | Kimi 直接做 | P0 |
| 合併重複腳本 | Kimi 直接做 | P0 |
| 建立 ~/.openclaw/automation/ 目錄結構 | Kimi 直接做 | P0 |

### Phase 1：核心建設（1 天）
| 任務 | 指派 | 優先級 |
|------|------|--------|
| 實作 `automation-ctl.sh` 統一控制器 | [Cursor] | P1 |
| 實作 `context-manager.sh` 合併版 | [Cursor] | P1 |
| 建立 launchd plist 自動啟動 taskboard | [Kimi] | P1 |
| 更新所有 cron job（全改 bash systemEvent） | [Kimi] | P1 |

### Phase 2：安全機制（1 天）
| 任務 | 指派 | 優先級 |
|------|------|--------|
| 熔斷器邏輯加入所有腳本 | [Cursor] | P2 |
| 預算看門狗 + 自動停用 | [Cursor] | P2 |
| 緊急停止機制（EMERGENCY_STOP） | [Kimi] | P2 |
| 日誌集中化 | [Kimi] | P2 |

### Phase 3：任務面板改進（見 TASK-DASHBOARD-AUDIT.md）
| 任務 | 指派 | 優先級 |
|------|------|--------|
| index.ts 路由拆分 | [Cursor] | P3 |
| TaskBoard.tsx 元件拆分 | [Cursor] | P3 |
| API 認證 | [Cursor] | P3 |
| Dashboard 圖表 | [Cursor] | P3 |

---

## 九、Kimi K2.5 移交指令

```
你是執行指揮官。請依序完成：

1. 讀取兩份文件：
   - docs/AUTOMATION-MASTER-PLAN.md（本文件）
   - docs/TASK-DASHBOARD-AUDIT.md

2. Phase 0 你自己直接做：
   - mkdir -p ~/.openclaw/automation/{logs,state}
   - mv 舊腳本到 scripts/archived/
   - 初始化 state.json

3. Phase 1-3 建立任務到任務面板：
   - 連線 http://localhost:3011/api/openclaw/tasks
   - 每個任務填好 name、description（含檔案路徑+驗收標準）、agent、priority
   - 用 [Cursor] 標記的任務設 agent=[Cursor]

4. 安排 Cron Job：
   - 用 cron tool 更新/新建排程
   - 全部用 bash systemEvent，不用 agentTurn
   - 參考本文件第四節的頻率設定

5. 完成後回報主人
```

---

## 十、成本對比

| 項目 | 改前（每日） | 改後（每日） |
|------|-------------|-------------|
| Autopilot | ~21M tokens（kimi） | $0（bash） |
| 監控 | 不定（AI 輪巡） | $0（bash） |
| 每日報告 | 1 次 kimi | 1 次 kimi |
| **預估日成本** | **$2-5+** | **< $0.10** |
