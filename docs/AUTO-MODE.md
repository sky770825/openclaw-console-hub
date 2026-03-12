# Auto Mode V2 設定檔

## 狀態
- **模式**: 自動 (auto)
- **規則**: 用戶介入即暫停，1分鐘無交流即自動，執行前強制備份
- **啟用時間**: 2026-02-13

## 運作機制

### 核心規則
1. **用戶介入即暫停**：收到訊息立即停止自動執行
2. **自動觸發詞**：「自動」、「自主執行」、「AUTO」、「執行」、「開始」
3. **1分鐘冷卻**：介入後1分鐘無交流 → 自動恢復執行
4. **強制備份**：所有任務執行前自動備份（特別是紅色警戒任務）

### 任務分級（全部自動，差別在備份範圍）

| 等級 | 自動執行 | 備份 | 範例 |
|------|----------|------|------|
| 🟢 低風險 | ✅ 是 | 基本備份 | checkpoint、記憶寫入、狀態查詢 |
| 🟡 中風險 | ✅ 是 | 完整備份 | cron 修改、模型切換、熔斷器植入 |
| 🔴 高風險 | ✅ 是 | 完整備份+rollback點 | config 覆蓋、刪除、系統更新 |

## 檔案
- `config/auto-mode.json` - 設定檔
- `scripts/auto-mode-watchdog.sh` - 自動模式核心
- `scripts/execute-task.sh` - 任務執行器

## Cron Jobs
- `auto-mode-watchdog` (0acbca26-f920-4cf5-863d-a4e336450693) - 每分鐘

## 操作指令
```bash
# 手動標記
./scripts/auto-mode-watchdog.sh intervention  # 標記用戶介入
./scripts/auto-mode-watchdog.sh clear         # 清除介入狀態
./scripts/auto-mode-watchdog.sh set-task "xxx" medium  # 設定待執行任務
```
