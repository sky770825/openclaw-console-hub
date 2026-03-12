# OpenClaw CLI Tool

> 🦾 OpenClaw 中控台 CLI 強化工具

## 功能特性

- **快捷指令** - 簡化常用操作
- **Web UI 整合** - 一鍵啟動控制台
- **Agent 管理** - 快速 spawn/stop Agents
- **模型監控** - 即時查看模型狀態
- **任務追蹤** - 任務板摘要一覽
- **自動補全** - Tab 鍵自動補全

## 安裝

### 一鍵安裝

```bash
curl -fsSL https://raw.githubusercontent.com/yourrepo/openclaw-cli/main/install.sh | bash
```

### 手動安裝

```bash
# 1. 克隆專案
git clone <repo> ~/.config/oc/cli

# 2. 執行安裝
cd ~/.config/oc/cli
./install.sh
```

## 快速開始

```bash
# 啟動 Web UI
oc dashboard

# 查看系統狀態
oc status

# 查看任務摘要
oc tasks

# 啟動 Agent
oc spawn coder "分析程式碼"

# 查看模型狀態
oc models
```

## 指令參考

| 指令 | 說明 | 範例 |
|------|------|------|
| `oc dashboard` | 啟動 Web UI | `oc dashboard --port 8080` |
| `oc tasks` | 任務板摘要 | `oc tasks --limit 10` |
| `oc models` | 模型狀態 | `oc models --refresh` |
| `oc spawn` | 啟動 Agent | `oc spawn coder "任務"` |
| `oc status` | 系統總覽 | `oc status` |
| `oc logs` | 查看日誌 | `oc logs coder` |
| `oc stop` | 停止 Agent | `oc stop coder` |
| `oc gateway` | Gateway 控制 | `oc gateway status` |
| `oc doctor` | 系統診斷 | `oc doctor` |

## 設定檔

設定檔位置：`~/.config/oc/config.yml`

```yaml
# OpenClaw CLI 設定
version: "1.0"

# Web UI 設定
webui:
  host: "localhost"
  port: 3000
  auto_open: true

# 預設模型
models:
  default: "kimi/kimi-k2.5"
  fallback: "gpt-4o"

# Agent 設定
agents:
  coder:
    model: "cursor"
    timeout: 300
  analyst:
    model: "kimi/kimi-k2.5"
    timeout: 120

# 顯示設定
display:
  colors: true
  emoji: true
  verbose: false
```

## 自動補全

安裝後自動啟用 Tab 補全。如需手動啟用：

```bash
# Bash
source ~/.config/oc/cli/completions/oc.bash

# Zsh
source ~/.config/oc/cli/completions/oc.zsh

# Fish
source ~/.config/oc/cli/completions/oc.fish
```

## 目錄結構

```
~/.config/oc/
├── config.yml          # 使用者設定
└── cli/
    ├── bin/
    │   └── oc          # 主入口
    ├── lib/
    │   ├── commands/   # 指令實作
    │   └── utils/      # 工具函數
    ├── completions/    # 自動補全腳本
    └── docs/
        └── runbook.md  # 操作手冊
```

## 開發

```bash
# 執行測試
./tests/run_tests.sh

# 檢查語法
shellcheck bin/oc lib/**/*.sh
```

## 授權

MIT License

## 支援

- 📖 文件: `oc --help`
- 📘 操作手冊: `cat docs/runbook.md`
- 🔧 診斷: `oc doctor`
