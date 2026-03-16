# unified-monitor.sh - 統合監控系統文檔

## 概述
統一監控 OpenClaw 所有系統組件，包括 Gateway、Task Board、任務執行狀態等。

## 快速開始
```bash
./unified-monitor.sh                 # 運行完整監控
./unified-monitor.sh --mode light    # 輕量監控
```

## 環境變數
- `API_URL`: Task Board API 地址 (默認: http://localhost:3011)
- `LOG_DIR`: 日誌目錄 (默認: ~/.openclaw/automation/logs)

## 常見命令
- 檢查 Gateway 狀態：`curl http://localhost:4445/health`
- 檢查 Task Board：`curl http://localhost:3011/api/status`

---
