#!/bin/bash
# OpenClaw Scripts 文檔索引
# 生成時間: 2026-02-14
# 用途: 列出所有腳本並建立索引

SCRIPTS_DIR="/Users/caijunchang/.openclaw/workspace/scripts"
OUTPUT="$SCRIPTS_DIR/README.md"

cat > "$OUTPUT" << 'EOF'
# 🚀 OpenClaw Scripts 完整指南

## 目錄結構

```
scripts/
├── lib/                          # 共用函式庫
│   ├── common.sh                # 通用函數（顏色、日誌、路徑等）
│   └── circuit-breaker.sh        # 熔斷器功能（防止連續失敗）
├── recovery/                     # 系統恢復工具
│   ├── backup.sh                # 系統備份
│   ├── recovery.sh              # 系統恢復
│   ├── health-check.sh          # 健康檢查
│   └── ...                      # 其他恢復工具
├── archived/                     # 已歸檔的腳本
│   ├── agent-bus.sh             # Agent 消息匯流排
│   ├── context-monitor.sh       # Context 監控
│   └── ...                      # 其他歸檔腳本
└── [核心腳本]                    # 主要操作腳本
    ├── checkpoint.sh            # 檢查點系統
    ├── unified-monitor.sh       # 統合監控
    ├── automation-ctl.sh        # 自動化控制
    └── ...                      # 其他核心腳本
```

## 📋 快速參考

### 系統監控 & 維護

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **unified-monitor.sh** | 統合監控系統 | `./unified-monitor.sh` |
| **context-auto-compact.sh** | Context 自動壓縮 | `./context-auto-compact.sh --dry-run` |
| **gateway-health-watchdog.sh** | Gateway 健康監控 | `./gateway-health-watchdog.sh` |
| **autopilot-checkpoint.sh** | 自動化檢查點 | `./autopilot-checkpoint.sh` |

### 任務管理

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **task-board-api.sh** | 任務板 API | `./task-board-api.sh list-tasks` |
| **refill-task-pool.sh** | 補充任務池 | `./refill-task-pool.sh` |
| **execute-task.sh** | 執行任務 | `./execute-task.sh <task_id>` |
| **cursor-task-launcher.sh** | Cursor 任務啟動器 | `./cursor-task-launcher.sh` |

### 系統恢復

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **recovery/backup.sh** | 系統備份 | `./recovery/backup.sh` |
| **recovery/recovery.sh** | 系統恢復 | `./recovery/recovery.sh` |
| **recovery/health-check.sh** | 健康檢查 | `./recovery/health-check.sh` |
| **openclaw-recovery.sh** | 完整恢復流程 | `./openclaw-recovery.sh` |

### 記憶 & Context 管理

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **checkpoint.sh** | 檢查點系統 | `./checkpoint.sh --help` |
| **memory_search.sh** | 記憶搜尋 | `./memory_search.sh "搜尋詞"` |
| **context-manager.sh** | Context 管理 | `./context-manager.sh status` |
| **build_memory_index_v2.sh** | 建立記憶索引 | `./build_memory_index_v2.sh` |

### 模型 & 成本管理

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **model-cost-tracker.sh** | 成本追蹤 | `./model-cost-tracker.sh` |
| **switch-model.sh** | 切換模型 | `./switch-model.sh kimi` |
| **opus-task.sh** | Opus 任務執行 | `./opus-task.sh` |

### 自動化 & 監控

| 腳本名稱 | 功能 | 用法 |
|---------|------|------|
| **automation-ctl.sh** | 自動化控制中心 | `./automation-ctl.sh status` |
| **auto-executor-lean.sh** | 輕量執行器 | `./auto-executor-lean.sh` |
| **idle-watchdog.sh** | 空閒監控器 | `./idle-watchdog.sh` |
| **dashboard-server.sh** | 儀表板伺服器 | `./dashboard-server.sh` |

### 共用函式庫

| 模組名稱 | 功能 | 用法 |
|---------|------|------|
| **lib/common.sh** | 通用函數 | `source lib/common.sh` |
| **lib/circuit-breaker.sh** | 熔斷器 | `source lib/circuit-breaker.sh && init_circuit_breaker "script_name"` |

---

## 🔧 常見任務

### 1️⃣ 檢查系統健康狀態

```bash
# 運行統合監控
./unified-monitor.sh

# 或檢查特定組件
./recovery/health-check.sh
./gateway-health-watchdog.sh
```

### 2️⃣ 管理任務

```bash
# 列出所有任務
./task-board-api.sh list-tasks

# 新增任務
./task-board-api.sh add-task "任務名稱" "描述"

# 執行任務
./execute-task.sh <task_id>

# 補充任務池
./refill-task-pool.sh
```

### 3️⃣ 監控 Context 使用

```bash
# 檢查 Context 使用率
./context-auto-compact.sh --dry-run

# 查看 Context 詳情
./context-manager.sh status

# 執行檢查點
./checkpoint.sh
```

### 4️⃣ 管理成本

```bash
# 查看今日成本
./model-cost-tracker.sh --period day

# 查看週報
./model-cost-tracker.sh --period week

# 導出 CSV
./model-cost-tracker.sh --period month --output csv
```

### 5️⃣ 系統備份與恢復

```bash
# 執行備份
./recovery/backup.sh

# 執行恢復
./recovery/recovery.sh

# 查看備份狀態
./recovery/health-check.sh
```

### 6️⃣ 自動化控制

```bash
# 查看自動化狀態
./automation-ctl.sh status

# 啟用自動化
./automation-ctl.sh enable

# 停用自動化
./automation-ctl.sh disable

# 查看連續錯誤
./automation-ctl.sh error-check
```

---

## 📝 使用共用函式庫

所有腳本都可以使用共用函式庫來簡化代碼：

```bash
#!/bin/bash
set -e

# 導入共用函數
source "$(dirname "$0")/lib/common.sh"

# 使用日誌函數
log_info "開始執行"
log_success "完成"
log_warning "警告訊息"
log_error "錯誤訊息"

# 使用路徑函數
OPENCLAW_HOME=$(get_openclaw_home)
WORKSPACE=$(get_workspace)

# 使用檔案檢查
if file_exists "$HOME/.openclaw/config.json"; then
    log_info "配置文件已存在"
fi
```

### 熔斷器使用示例

```bash
#!/bin/bash
set -e

# 導入熔斷器
source "$(dirname "$0")/lib/circuit-breaker.sh"

# 初始化熔斷器（腳本名稱、最大錯誤次數）
init_circuit_breaker "my_script" 5

# 主邏輯
# 如果出錯，熔斷器會自動記錄，並在達到最大次數時停止執行
```

---

## 🐛 故障排查

### 問題：腳本執行失敗 "set -e"

**症狀**：腳本在遇到錯誤時立即停止

**解決方案**：
1. 檢查錯誤日誌：`tail -100 ~/.openclaw/automation/logs/automation.log`
2. 查看腳本中 `set -e` 後的命令是否正確
3. 嘗試執行 `bash -n <script>` 驗證語法

### 問題：熔斷器阻止執行

**症狀**：腳本無法執行，顯示"已熔斷"

**解決方案**：
```bash
# 查看熔斷器狀態
./lib/circuit-breaker.sh status

# 重置錯誤計數
./lib/circuit-breaker.sh reset <script_name>

# 解除緊急停止（如果啟動了全局停止）
./lib/circuit-breaker.sh resume
```

### 問題：Context 用量過高

**症狀**：Context 使用超過 85%

**解決方案**：
```bash
# 檢查 Context 狀態
./context-auto-compact.sh --dry-run

# 執行檢查點來清理 Context
./checkpoint.sh

# 查看記憶使用
./sub-agent-monitor.sh --all
```

---

## 📚 進階用法

### 使用環境變數自訂行為

```bash
# 設定 OpenClaw 主目錄
export OPENCLAW_HOME=/path/to/openclaw

# 設定工作區
export OPENCLAW_WORKSPACE=/path/to/workspace

# 設定 Telegram 通知
export TELEGRAM_BOT_TOKEN=<token>
export TELEGRAM_CHAT_ID=<chat_id>

# 啟用除錯模式
export DEBUG=true

# 設定 API 端點
export TASK_BOARD_API="http://localhost:3011"
```

### 日誌位置

所有日誌都存放在 `~/.openclaw/automation/logs/`:

- `automation.log` - 主要自動化日誌
- `monitor.log` - 監控日誌
- `recovery.log` - 恢復日誌

### 狀態文件

系統狀態存放在 `~/.openclaw/automation/state/`:

- `state.json` - 熔斷器和自動化狀態
- `hourly-report.json` - 小時報告
- `checkpoint.json` - 檢查點資訊

---

## 🔐 安全建議

1. **定期備份**：運行 `./recovery/backup.sh` 至少每天一次
2. **監控監控器**：設置 cron job 運行 `./unified-monitor.sh`
3. **檢查日誌**：定期檢查 `~/.openclaw/automation/logs/`
4. **測試恢復**：定期測試 `./recovery/recovery.sh`
5. **更新腳本**：保持所有腳本都有 `set -e` 錯誤處理

---

## 📖 腳本詳細文檔

詳細文檔請參見各腳本的 Header 註釋或運行 `--help`:

```bash
./checkpoint.sh --help
./unified-monitor.sh --help
./automation-ctl.sh --help
./task-board-api.sh --help
```

---

## 🤝 貢獻指南

如果修改或新增腳本：

1. **必須添加 `set -e` 或 `set -euo pipefail`**
2. **添加完整的 Header 說明**
3. **使用共用函式庫（lib/*.sh）減少重複代碼**
4. **驗證語法**：`bash -n <script>`
5. **測試執行**：確保功能正確
6. **備份原始版本**：修改前備份到 `backups/`

---

最後更新：2026-02-14 02:45 GMT+8
維護者：小蔡（OpenClaw Agent）
EOF

echo "✅ 已生成 $OUTPUT"
cat "$OUTPUT" | head -100
