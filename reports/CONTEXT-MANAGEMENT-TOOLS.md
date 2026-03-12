# Context 自動管理工具使用指南

建立日期：2026-02-12  
作者：執行員 D

## 概述

這三個腳本用於自動管理 OpenClaw 的 Context 使用情況，協助監控和優化 AI Agent 的資源使用。

---

## 1. context-auto-compact.sh

### 功能
- ✅ 自動檢查當前 session 的 context 使用率
- ✅ 使用率 >70% 時自動執行 checkpoint
- ✅ 使用率 >85% 時發出強制警告並建立警告檔案
- ✅ 支援 dry-run 模式測試

### 使用方式

```bash
# 檢查預設 session (agent:main:main)
./scripts/context-auto-compact.sh

# 檢查特定 session
./scripts/context-auto-compact.sh --session agent:main:subagent:xxxxx

# 只檢查不執行動作（測試模式）
./scripts/context-auto-compact.sh --dry-run

# 查看說明
./scripts/context-auto-compact.sh --help
```

### 運作邏輯

| Context 使用率 | 動作 |
|---------------|------|
| < 70% | ✅ 正常，無動作 |
| 70-84% | ⚡ 執行 checkpoint |
| ≥ 85% | 🚨 發出警告 + 執行 checkpoint + 建立警告檔 |

### 整合方式

**方法一：Heartbeat 整合**

在 `HEARTBEAT.md` 中加入：

```markdown
## Context 檢查
- 每次心跳時執行：`./scripts/context-auto-compact.sh --dry-run`
- 如果使用率 >60%，執行：`./scripts/context-auto-compact.sh`
```

**方法二：Cron Job**

```bash
# 每小時檢查一次
0 * * * * cd ~/.openclaw/workspace && ./scripts/context-auto-compact.sh >> memory/context-auto.log 2>&1
```

### 日誌位置

- 執行日誌：`~/.openclaw/workspace/memory/context-auto-compact.log`
- 警告檔案：`~/.openclaw/workspace/memory/CONTEXT_WARNING.txt`

---

## 2. sub-agent-monitor.sh

### 功能
- 📊 列出所有活躍的子 Agent session
- 💾 顯示每個 session 的 token 使用量和狀態
- 🧟 檢測殭屍 session（超過 30 分鐘無回應）
- 🗑️ 提供清理建議

### 使用方式

```bash
# 查看所有子 Agent
./scripts/sub-agent-monitor.sh

# 查看所有 session（包含主 session）
./scripts/sub-agent-monitor.sh --all

# 只顯示殭屍 session
./scripts/sub-agent-monitor.sh --zombie-only

# JSON 格式輸出
./scripts/sub-agent-monitor.sh --json

# 嘗試清理殭屍 session（會提供指令）
./scripts/sub-agent-monitor.sh --cleanup
```

### 輸出範例

```
========================================
   子 Agent Session 監控
========================================
時間: 2026-02-12 22:08:01

✅ [ACTIVE] agent:main:subagent:xxx
   ├─ Session ID: xxx
   ├─ Model: claude-sonnet-4-5
   ├─ 最後活動: 27s 前
   ├─ Token 使用: 40004 / 200000
   └─ 使用率: 20.0%

🧟 [ZOMBIE] agent:main:subagent:yyy
   ├─ Session ID: yyy
   ├─ Model: kimi-k2.5
   ├─ 最後活動: 35m 前
   ├─ Token 使用: 120000 / 200000
   └─ 使用率: 60.0%

========================================
統計摘要
========================================
活躍 Session: 5
殭屍 Session: 1 (超過 30 分鐘無活動)
總 Token 使用: 862858
========================================
```

### 定期監控

建議每天執行一次，清理殭屍 session：

```bash
# 加入到每日維護腳本
./scripts/sub-agent-monitor.sh --zombie-only >> memory/zombie-check.log
```

---

## 3. model-cost-tracker.sh

### 功能
- 💰 統計各模型的 token 使用量
- 📈 計算估算成本（基於公開定價）
- 📅 支援日報/週報/月報
- 📊 多種輸出格式（表格、CSV、JSON）

### 使用方式

```bash
# 今日報表（表格格式）
./scripts/model-cost-tracker.sh

# 本週報表
./scripts/model-cost-tracker.sh --period week

# 本月報表
./scripts/model-cost-tracker.sh --period month

# 指定日期
./scripts/model-cost-tracker.sh --date 2026-02-11

# CSV 格式輸出
./scripts/model-cost-tracker.sh --format csv

# JSON 格式輸出
./scripts/model-cost-tracker.sh --format json

# 儲存到檔案
./scripts/model-cost-tracker.sh --save reports/cost-report-$(date +%Y%m%d).txt
```

### 輸出範例

```
========================================
   模型使用成本報表
========================================
週期: day
日期: 2026-02-12
生成時間: 2026-02-12 22:09:33

模型                         輸入 Tokens 輸出 Tokens 成本 (USD)    Session
------------------------------------------------------------------------
kimi-k2.5                       73,731         765 $     0.0230          5
claude-sonnet-4-5              544         55,459 $     0.8335          6
claude-opus-4-6                 11,999         151 $     0.1913          1
------------------------------------------------------------------------
總計                            86,274      56,375 $     1.0478         12
========================================
```

### 定價基準（每 1M tokens，USD）

| 模型 | Input | Output |
|------|-------|--------|
| Claude Opus 4 | $15 | $75 |
| Claude Sonnet 4 | $3 | $15 |
| Kimi K2.5 | $0.3 | $1.2 |
| GPT-4 Turbo | $10 | $30 |
| 預設（未知模型）| $1 | $3 |

### 定期報表

建議每日/每週自動生成報表：

```bash
# 每日報表（加入 cron）
0 0 * * * cd ~/.openclaw/workspace && \
  ./scripts/model-cost-tracker.sh --format table \
  --save "reports/daily-cost-$(date +%Y%m%d).txt"

# 每週報表（每週一）
0 0 * * 1 cd ~/.openclaw/workspace && \
  ./scripts/model-cost-tracker.sh --period week --format csv \
  --save "reports/weekly-cost-$(date +%Y-W%V).csv"
```

---

## 整合建議

### 1. 加入 HEARTBEAT.md

```markdown
## Context 管理檢查（每次心跳）

1. 執行 context 檢查：
   ```bash
   ./scripts/context-auto-compact.sh --dry-run
   ```

2. 如果使用率 >60%，執行壓縮：
   ```bash
   ./scripts/context-auto-compact.sh
   ```

3. 每小時檢查子 Agent 狀態：
   ```bash
   ./scripts/sub-agent-monitor.sh | tail -20
   ```
```

### 2. 建立每日維護腳本

建立 `scripts/daily-maintenance.sh`：

```bash
#!/bin/bash
echo "=== 每日維護 $(date) ==="

# 1. 檢查殭屍 session
echo "檢查殭屍 session..."
./scripts/sub-agent-monitor.sh --zombie-only

# 2. 生成成本報表
echo "生成成本報表..."
./scripts/model-cost-tracker.sh --save "reports/daily-$(date +%Y%m%d).txt"

# 3. 檢查 context 使用
echo "檢查 context..."
./scripts/context-auto-compact.sh

echo "維護完成！"
```

### 3. Dashboard 整合

建議建立一個 dashboard 腳本整合三個工具：

```bash
#!/bin/bash
# dashboard.sh - 快速查看系統狀態

echo "╔════════════════════════════════════════╗"
echo "║   OpenClaw Context 管理 Dashboard     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Context 狀態
./scripts/context-auto-compact.sh --dry-run | tail -3

echo ""

# 子 Agent 狀態
./scripts/sub-agent-monitor.sh | tail -10

echo ""

# 今日成本
./scripts/model-cost-tracker.sh | tail -8
```

---

## 故障排除

### 問題 1：無法獲取 session 資訊

**症狀**：`❌ 無法獲取 session 資訊`

**解決方式**：
1. 確認 OpenClaw 正在執行：`openclaw gateway status`
2. 確認有活躍的 session：`openclaw sessions status`

### 問題 2：jq 未安裝

**症狀**：`command not found: jq`

**解決方式**：
```bash
brew install jq
```

### 問題 3：checkpoint.sh 不存在

**症狀**：`❌ 錯誤：checkpoint.sh 不存在`

**解決方式**：
確認 `scripts/checkpoint.sh` 存在且可執行：
```bash
ls -la ~/.openclaw/workspace/scripts/checkpoint.sh
chmod +x ~/.openclaw/workspace/scripts/checkpoint.sh
```

---

## 技術細節

### 相容性
- ✅ Bash 3.2+（macOS 原生支援）
- ✅ 不需要 Bash 4（關聯陣列）
- ✅ 使用標準 UNIX 工具（awk, sed, jq）

### 依賴項
- `jq` - JSON 處理
- `awk` - 數據處理
- `openclaw` CLI - OpenClaw 命令列工具

### 設計原則
1. **零依賴外部 API** - 只讀取本地 session 資料
2. **向後相容** - 支援舊版 Bash
3. **安全優先** - 使用 dry-run 和確認機制
4. **可擴展** - 易於加入新功能和格式

---

## 更新日誌

### 2026-02-12
- ✅ 初始版本發布
- ✅ 三個核心腳本完成
- ✅ Bash 3.2 相容性修正
- ✅ 完整文件撰寫

---

## 授權與貢獻

這些工具是 OpenClaw 專案的一部分，由執行員 D 建立。

如有問題或建議，請更新此文件或在主會話中提出。
