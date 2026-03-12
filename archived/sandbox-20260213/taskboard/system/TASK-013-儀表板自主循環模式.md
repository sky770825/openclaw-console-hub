# TASK-013: 儀表板自主循環模式（中控核心）

## 任務資訊
- **任務 ID**: TASK-013
- **類型**: 持續性中控任務
- **狀態**: running
- **建立時間**: 2026-02-13
- **優先級**: 🔴 最高

## 任務說明
這是 OpenClaw 中控系統的核心循環任務，負責每小時自動：

### 循環職責
1. **巡檢任務板** — 檢查 pending/running 狀態
2. **生成情報任務** — 市場資訊、競品動態、商業機會
3. **派發執行** — 呼叫 Autopilot 分派器
4. **彙整報告** — 累積洞察，定期總結

### 執行機制
- **Cron 排程**: 每小時 0 分執行
- **指令**: `./scripts/autopilot-controller.sh once`
- **日誌**: `taskboard/.history/autopilot-cron.log`

### 關聯腳本
- `autopilot-controller.sh` — 主控
- `autopilot-dispatcher.sh` — 分派器
- `dashboard-monitor.sh` — 儀表板

## 狀態追蹤
- [x] 建立持續任務檔案
- [x] 設定 cron 排程（每小時）
- [ ] 第一次循環驗證
- [ ] 建立循環執行報告機制

## 備註
此任務永不結束，持續運作直到手動停止。
