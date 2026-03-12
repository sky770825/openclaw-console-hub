# 練習 A-4：Server 啟動流程分析

> 日期：2026-03-02
> 來源：server/src/index.ts (前 100 行)

## 啟動初始化流程

根據 server/src/index.ts 的代碼，OpenClaw Server 啟動時依序執行了以下操作：

### 1. 環境準備
- 載入環境變數 (import './preload-dotenv.js')。
- 初始化日誌記錄器 (createLogger)。

### 2. Express 應用實例化
- 建立 app = express()。
- 掛載安全與性能中間件：
    - helmet(): 設定安全標頭。
    - cors(): 處理跨域請求。
    - rateLimit(): 防止請求濫用。

### 3. Supabase 連線
- 檢查 hasSupabase 狀態，確認資料庫連線。

### 4. 路由掛載
- 掛載核心業務路由：
    - /api/tasks: 舊版任務路由。
    - /api/openclaw/tasks: 新版 Supabase 任務路由。
    - /api/projects: 專案管理。
    - /api/memory: 記憶庫操作。
    - /api/federation: 聯邦協防。
    - /api/insights: 數據洞察。

### 5. Telegram Bot 啟動
- 呼叫 startTelegramStopPoll() 啟動 Telegram 機器人輪詢，負責接收指令。

### 6. 初始化種子資料 (Conditional)
- 如果是首次啟動或開發模式，可能會執行 runSeed() 來填充初始數據（視具體邏輯而定）。