# Context Watchdog 系統配置

## 功能
智能監控 Context 使用率，在關鍵時機發送提醒並自動備份。

## 觸發門檻

| 使用率 | 動作 | 冷卻時間 |
|--------|------|----------|
| 60%+ | 💡 輕提示（僅上升時） | 10 分鐘 |
| 70%+ | ⚠️ 明確建議 + 自動備份 | 10 分鐘 |
| 85%+ | 🚨 緊急提醒 + 自動備份 | 10 分鐘 |

## 檔案位置

```
scripts/context-watchdog.sh          # 主腳本
scripts/autopilot-context-watchdog.sh # Cron 包裝器
memory/auto-context-YYYYMMDD-HHMMSS.md # 自動備份檔案
```

## Cron Job

```
ID: 2441421b-aa38-4dad-80a4-137ce3993970
頻率: 每 5 分鐘
狀態: enabled
```

## 手動測試

```bash
# 模擬不同使用率
CONTEXT_PERCENT=65 ./scripts/context-watchdog.sh  # 測試 60% 提醒
CONTEXT_PERCENT=75 ./scripts/context-watchdog.sh  # 測試 70% 建議
CONTEXT_PERCENT=90 ./scripts/context-watchdog.sh  # 測試 85% 緊急
```

## 日誌

```
~/.openclaw/logs/context-watchdog.log
~/.openclaw/logs/autopilot-context.log
```
