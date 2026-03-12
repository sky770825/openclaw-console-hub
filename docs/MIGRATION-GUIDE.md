# OpenClaw 移機安裝指南

## 🚀 快速開始

在新 Mac 上一鍵完成 OpenClaw 移機安裝。

## 📋 事前準備

1. **備份檔案**: 確保有 `core-backup-*.tar.gz` 檔案
2. **網路連線**: 需要下載 OpenClaw 和依賴
3. **管理員權限**: 可能需要輸入密碼安裝軟體

## 📦 安裝步驟

### 方法 1: 自動搜尋備份（推薦）

```bash
# 1. 下載腳本
curl -o install-openclaw-migration.sh \
  https://raw.githubusercontent.com/your-repo/install-openclaw-migration.sh

# 2. 執行腳本
bash install-openclaw-migration.sh
```

腳本會自動搜尋以下位置的備份：
- `~/Downloads/core-backup-*.tar.gz`
- `~/Desktop/core-backup-*.tar.gz`
- `~/.openclaw/backups/full/core-backup-*.tar.gz`
- 當前目錄 `./core-backup-*.tar.gz`

### 方法 2: 指定備份路徑

```bash
bash install-openclaw-migration.sh /path/to/your/core-backup-20260214-144556.tar.gz
```

## ✅ 腳本會自動完成

- [x] 檢查 macOS 系統
- [x] 安裝/更新 Homebrew（如需要）
- [x] 安裝/更新 Node.js 18+
- [x] 安裝 OpenClaw CLI
- [x] 搜尋並驗證備份檔案
- [x] 解壓備份到 `~/.openclaw/`
- [x] 安裝 Ollama（可選）
- [x] 安裝所有 skill 的 npm 依賴
- [x] 驗證安裝結果
- [x] 啟動 Gateway（可選）

## 🔧 安裝後設定

### 1. 檢查 API Keys

```bash
cat ~/.openclaw/.env
```

如有需要，編輯更新 API keys：
```bash
openclaw config edit
```

### 2. 下載 Ollama 模型（如安裝了 Ollama）

```bash
ollama pull qwen3:8b
ollama pull llama3.2
```

### 3. 安裝 Chrome Extension（如需 Browser 功能）

1. 開啟 Chrome
2. 安裝 OpenClaw Browser Relay extension
3. 點擊 toolbar 圖示連接

### 4. 驗證安裝

```bash
openclaw status
openclaw gateway status
```

## 🐛 疑難排解

### "未找到備份檔案"

確保備份檔案放在以下位置之一：
- 下載資料夾
- 桌面
- 執行腳本的目錄

或手動指定路徑：
```bash
bash install-openclaw-migration.sh /完整/路徑/備份.tar.gz
```

### "Homebrew 未安裝"

腳本會提示安裝指令，或手動安裝：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### "npm install 失敗"

可能是網路問題，重試：
```bash
cd ~/.openclaw/workspace
npm install
```

## 📁 備份內容說明

核心備份包含：
- `workspace/` - 專案、skills、scripts、docs
- `memory/` - 記憶庫（sqlite、recall）
- `agents/` - 會話歷史
- `config/` - 頻道/服務設定
- `credentials/` - 加密憑證
- `cron/` - 排程任務
- `openclaw.json` - Gateway 核心設定
- `.env` - 環境變數

## 🔄 完整還原流程

```
┌─────────────────┐
│  新 Mac 開機     │
├─────────────────┤
│ 1. 安裝 Homebrew │
│ 2. 執行腳本      │
│ 3. 輸入密碼      │
│ 4. 等待完成      │
│ 5. 啟動 Gateway  │
│ 6. Telegram 測試 │
└─────────────────┘
```

## 📝 日誌檔案

安裝過程會產生日誌：
```
~/openclaw-install-YYYYMMDD-HHMMSS.log
```

出問題時可查看此檔案除錯。

## 🆘 需要幫助？

- OpenClaw 文件: https://docs.openclaw.ai
- 社群: https://discord.com/invite/clawd
- 緊急聯絡: 檢查腳本產生的日誌檔案

---

**最後更新**: 2026-02-14
**適用版本**: OpenClaw CLI 最新版
