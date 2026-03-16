# Context 管理工具快速參考

## 快速開始

```bash
# 檢查主 session context
./context-auto-compact.sh --dry-run

# 監控所有子 Agent
./sub-agent-monitor.sh

# 查看今日成本
./model-cost-tracker.sh
```

## 三大工具

### 1️⃣ context-auto-compact.sh
**用途**：自動監控並壓縮 context

```bash
./context-auto-compact.sh              # 檢查並執行動作
./context-auto-compact.sh --dry-run    # 只檢查不動作
./context-auto-compact.sh --help       # 查看說明
```

**閾值**：
- >70% → 執行 checkpoint
- >85% → 發出警告

---

### 2️⃣ sub-agent-monitor.sh
**用途**：監控子 Agent 和殭屍 session

```bash
./sub-agent-monitor.sh                 # 查看所有子 Agent
./sub-agent-monitor.sh --all           # 包含主 session
./sub-agent-monitor.sh --zombie-only   # 只看殭屍
./sub-agent-monitor.sh --json          # JSON 格式
```

**殭屍定義**：超過 30 分鐘無活動

---

### 3️⃣ model-cost-tracker.sh
**用途**：統計模型使用和成本

```bash
./model-cost-tracker.sh                      # 今日報表
./model-cost-tracker.sh --period week        # 本週
./model-cost-tracker.sh --format csv         # CSV 格式
./model-cost-tracker.sh --save report.txt    # 儲存檔案
```

**支援週期**：day, week, month  
**支援格式**：table, csv, json

---

## 整合範例

### Heartbeat 整合

```bash
# 加入 HEARTBEAT.md
./scripts/context-auto-compact.sh --dry-run
```

### 每日維護

```bash
# 建立 cron job
0 0 * * * cd ~/.openclaw/workspace && \
  ./scripts/model-cost-tracker.sh \
  --save reports/daily-$(date +%Y%m%d).txt
```

### Dashboard

```bash
# 一鍵查看所有狀態
cat > dashboard.sh <<'EOF'
#!/bin/bash
echo "╔═══ Context 狀態 ═══╗"
./scripts/context-auto-compact.sh --dry-run | tail -3
echo ""
echo "╔═══ 子 Agent ═══╗"
./scripts/sub-agent-monitor.sh | tail -8
echo ""
echo "╔═══ 今日成本 ═══╗"
./scripts/model-cost-tracker.sh | tail -6
EOF
chmod +x dashboard.sh
```

---

## 完整文件

詳細說明請參閱：`docs/CONTEXT-MANAGEMENT-TOOLS.md`

---

**建立日期**：2026-02-12  
**作者**：執行員 D
