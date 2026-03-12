# OpenClaw CLI 操作手冊

> 本文檔提供 OpenClaw CLI 的詳細操作指南

## 目錄

1. [快速入門](#快速入門)
2. [指令詳解](#指令詳解)
3. [進階用法](#進階用法)
4. [故障排除](#故障排除)
5. [參考資料](#參考資料)

---

## 快速入門

### 安裝

```bash
# 一鍵安裝
curl -fsSL https://.../install.sh | bash

# 或手動安裝
git clone <repo> ~/.config/oc/cli
cd ~/.config/oc/cli
./install.sh
```

### 基本工作流程

```bash
# 1. 檢查系統狀態
oc doctor

# 2. 啟動 Web UI
oc dashboard

# 3. 查看任務
oc tasks

# 4. 啟動 Agent 執行任務
oc spawn coder "修復 bug"

# 5. 監控狀態
oc status
```

---

## 指令詳解

### `oc dashboard` - 啟動 Web UI

啟動 OpenClaw 的 Web 控制介面。

```bash
# 基本用法
oc dashboard

# 指定端口
oc dashboard -p 8080

# 背景執行
oc dashboard -d

# 不自動開啟瀏覽器
oc dashboard --no-open
```

### `oc tasks` - 任務板摘要

查看和管理任務。

```bash
# 顯示最近任務
oc tasks

# 限制數量
oc tasks -l 10

# 按狀態過濾
oc tasks -s running    # 只顯示執行中
oc tasks -s pending    # 只顯示等待中
oc tasks -s completed  # 只顯示已完成

# 持續監控
oc tasks --watch
```

### `oc models` - 模型狀態

查看可用 AI 模型的狀態。

```bash
# 顯示所有模型
oc models

# 只顯示可用模型
oc models -a

# 顯示詳細資訊
oc models -d

# 重新整理快取
oc models -r
```

### `oc spawn` - 啟動 Agent

啟動 Agent 執行特定任務。

```bash
# 基本用法
oc spawn coder "修復登入頁面的 bug"

# 指定模型
oc spawn analyst "分析數據" -m gpt-4o

# 設定超時
oc spawn research "調查技術方案" -t 600

# 背景執行
oc spawn coder "重構程式碼" -d

# 乾跑模式 (測試)
oc spawn coder "測試任務" --dry-run
```

**Agent 類型:**

| 類型 | 用途 | 預設模型 |
|------|------|----------|
| `coder` | 程式開發 | cursor |
| `analyst` | 資料分析 | kimi-k2.5 |
| `research` | 研究調查 | grok-4.1 |
| `reviewer` | 程式碼審查 | kimi-k2.5 |

### `oc status` - 系統總覽

顯示系統整體狀態。

```bash
# 完整輸出
oc status

# JSON 格式
oc status -j

# 簡潔輸出
oc status -q
```

### `oc gateway` - Gateway 控制

控制 OpenClaw Gateway 服務。

```bash
# 查看狀態
oc gateway status

# 啟動
oc gateway start

# 停止
oc gateway stop

# 重啟
oc gateway restart

# 查看日誌
oc gateway logs

# 追蹤日誌
oc gateway logs -f
```

### `oc doctor` - 系統診斷

診斷系統健康度。

```bash
# 執行診斷
oc doctor

# 自動修復問題
oc doctor -f

# 詳細輸出
oc doctor -v
```

---

## 進階用法

### 設定檔管理

```bash
# 編輯設定檔
oc config

# 取得設定值
oc config get models.default

# 設定值
oc config set webui.port 8080

# 重設設定
oc config reset

# 顯示設定檔路徑
oc config path
```

### 任務管理腳本範例

```bash
#!/bin/bash
# batch_tasks.sh - 批次執行任務

TASKS=(
    "coder:重構 authentication 模組"
    "analyst:分析效能瓶頸"
    "reviewer:審查 PR #123"
)

for task in "${TASKS[@]}"; do
    IFS=':' read -r agent desc <<< "$task"
    echo "啟動 $agent: $desc"
    oc spawn "$agent" "$desc" -d
    sleep 5
done

# 監控狀態
oc tasks --watch
```

### 自動補全設定

**Bash:**
```bash
echo 'source ~/.config/oc/cli/completions/oc.bash' >> ~/.bashrc
```

**Zsh:**
```bash
# 自動設定，或手動：
echo 'fpath+=~/.zsh/completions' >> ~/.zshrc
```

**Fish:**
```bash
# 自動設定
```

---

## 故障排除

### 問題: `oc: command not found`

**解決方案:**
```bash
# 1. 確認安裝路徑在 PATH 中
export PATH="$HOME/.local/bin:$PATH"

# 2. 重新載入 shell 設定
source ~/.bashrc  # 或 ~/.zshrc

# 3. 確認檔案存在
ls -la ~/.local/bin/oc
```

### 問題: Gateway 無法啟動

**解決方案:**
```bash
# 1. 檢查端口占用
lsof -i :8080

# 2. 查看日誌
oc gateway logs

# 3. 手動啟動除錯
openclaw gateway start --verbose
```

### 問題: Web UI 無法開啟

**解決方案:**
```bash
# 1. 檢查 Node.js
node --version

# 2. 重新安裝依賴
cd ~/.openclaw/workspace/projects/dashboard/modules/web-ui
npm install

# 3. 清除快取
rm -rf node_modules .next
npm install
```

### 問題: Agent 無法啟動

**解決方案:**
```bash
# 1. 檢查 API 金鑰
echo $KIMI_API_KEY

# 2. 執行診斷
oc doctor

# 3. 查看任務狀態
oc tasks

# 4. 檢查日誌
oc logs coder
```

---

## 參考資料

### 檔案位置

| 項目 | 路徑 |
|------|------|
| CLI 安裝目錄 | `~/.config/oc/cli/` |
| 設定檔 | `~/.config/oc/config.yml` |
| 日誌檔 | `~/.config/oc/oc.log` |
| 任務資料 | `~/.openclaw/tasks/` |
| Web UI | `~/.openclaw/workspace/projects/dashboard/modules/web-ui/` |

### 環境變數

| 變數 | 說明 |
|------|------|
| `KIMI_API_KEY` | 月之暗面 API 金鑰 |
| `OPENAI_API_KEY` | OpenAI API 金鑰 |
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 |
| `XAI_API_KEY` | xAI API 金鑰 |
| `GOOGLE_API_KEY` | Google API 金鑰 |
| `OC_COLORS` | 設定為 `false` 禁用顏色輸出 |

### 快速參考卡

```
oc dashboard          # 啟動 Web UI
oc tasks              # 查看任務
oc models             # 模型狀態
oc spawn <a> <t>      # 啟動 Agent
oc status             # 系統總覽
oc logs [agent]       # 查看日誌
oc stop <agent>       # 停止 Agent
oc gateway <cmd>      # Gateway 控制
oc doctor             # 系統診斷
oc config             # 編輯設定
```

---

## 更新日誌

### v1.0.0 (2024-02-14)

- ✨ 初始版本發布
- 🚀 支援 dashboard, tasks, models, spawn, status 等核心指令
- 🔧 整合 gateway 控制
- 📊 系統診斷功能
- 🎨 自動補全支援

---

**文件版本:** 1.0.0  
**最後更新:** 2024-02-14
