# Cursor 協作導航圖 (v1.1)

## 🛠 核心架構快照
- 後端 (server/): Express + Supabase。核心邏輯在 executor-agents.ts (執行) 與 openclawMapper.ts (型別轉換)。
- 前端 (src/): React + TS。頁面主體在 src/pages/。
- 資料流: DB (queued) ↔ Mapper ↔ UI (ready)。

## 🚦 狀態映射表 (重要！)
- DB: queued      → UI: ready / draft / blocked
- DB: in_progress → UI: running / review
- DB: done        → UI: done 

## 📂 前端甲板索引 (src/pages/)
- AI 甲板: AIDeck.tsx (模型與意識狀態)
- 工程甲板: InfraDeck.tsx (基礎設施)
- 任務看板: TaskBoard.tsx (核心操作台)
- 自動化甲板: AutomationDeck.tsx (Auto-Executor)

## 🤖 達爾 (Xiao Cai) 協作模式
- 我負責: 全局判斷、下達任務 (create_task)、執行腳本 (run_script)、驗證結果。
- Cursor 負責: 代碼精確編輯、UI 刻畫、複雜邏輯重構。
- 聯動方式: 主人讓達爾建任務 -> Cursor 讀取任務描述 -> Cursor 改代碼 -> 達爾跑測試驗收。
