# Autopilot（自主循環模式）功能規格

## 概述
在任務板中控台加入「自動駕駛」開關，讓小蔡在老蔡不在電腦前時自主循環執行任務。

## API 端點

### 後端（加到 server/src/index.ts）

```
POST /api/openclaw/autopilot/start   → 開啟自主循環
POST /api/openclaw/autopilot/stop    → 關閉回人工模式
GET  /api/openclaw/autopilot/status  → 查詢狀態
GET  /api/openclaw/autopilot/log     → 查詢循環日誌
```

### 狀態結構
```typescript
interface AutopilotState {
  enabled: boolean;
  startedAt: string | null;
  cycleCount: number;          // 已執行循環次數
  lastCycleAt: string | null;  // 上次循環時間
  currentTask: string | null;  // 正在處理的任務
  intervalMs: number;          // 循環間隔（預設 600000 = 10分鐘）
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    researchDone: number;
  };
}
```

## 循環邏輯（核心）

每次循環（每 10 分鐘）：

```
1. 檢查開關 → OFF 就跳過
2. 檢查任務板待辦清單
   ├─ 有待辦 → 取最高優先級任務 → 透過 OpenClaw sessions_send 分派執行
   └─ 無待辦 → 進入「自主探索」模式
3. 自主探索模式：
   a. 搜尋市場需求/趨勢
   b. 研究新技術/工具
   c. 找上架平台機會
   d. 生成行銷文案
   e. 將發現寫成新任務加入任務板
4. 回報進度（透過 @ollama168bot 或任務板更新）
5. 等待下一循環
```

## 與 OpenClaw 整合

Autopilot 透過 OpenClaw Cron Job 觸發：
- Cron 每 10 分鐘發一個 systemEvent
- systemEvent 觸發小蔡檢查 autopilot 狀態
- 如果 ON → 執行循環邏輯
- 如果 OFF → 跳過

## 前端 UI

在中控台頁面加一個開關：
- 大按鈕：🟢 自主模式 ON / 🔴 手動模式
- 顯示：循環次數、上次循環時間、完成任務數
- 日誌面板：最近 10 次循環的動作記錄

## 成本控制
- 自主循環只用 Kimi K2.5 + Ollama + OR Free
- 禁止在自主模式中使用 Opus 4.6
- 每次循環的 token 上限：10K
