# OpenClaw 任務板 — 模組邊界

對齊 Codex 模組化：一域一模組、API + 單一資料源、Progressive disclosure。

## 模組一覽

| 模組 | 職責 | API 前綴 | Supabase 表 | 前端資料 |
|------|------|----------|-------------|----------|
| **tasks** | 任務 CRUD、執行、刪除 | /api/openclaw/tasks | openclaw_tasks | tasks state, TaskBoard, Drawer(任務) |
| **reviews** | 審核列表、批准/駁回 | /api/openclaw/reviews | openclaw_reviews | reviews state, ReviewPanel, Drawer(審核) |
| **automations** | 排程開關、流程鏈 | /api/openclaw/automations | openclaw_automations | autos state, AutoPanel, Drawer(自動化) |
| **evolution-log** | 進化紀錄寫入與列表 | /api/openclaw/evolution-log | openclaw_evolution_log | evo state, EvoPanel, addE() |
| **board-config** | n8n/API/安全/Plugin 展示 | /api/openclaw/board-config | 無（後端常數 + n8n API） | boardConfig state, N8n/Api/Security/PluginPanel |

## 程式碼對照

- **後端**  
  - `server/src/index.ts`：路由與 handler。  
  - `server/src/openclawSupabase.ts`：各模組 fetch/upsert/insert。  
  - `server/src/openclawMapper.ts`：OpenClaw ↔ 主應用型別轉換。

- **前端（中控板）**  
  - `src/services/openclawBoardApi.ts`：fetchOpenClaw、persistTask/Review/Automation/Evo、runTask、deleteTask、createTask。  
  - `src/data/openclawBoardFallback.ts`：各模組 fallback 常數（API 失敗時）。  
  - `openclaw-cursor.jsx`：Stats、AutoPanel、ReviewPanel、TaskBoard、N8nPanel、ApiPanel、SecurityPanel、PluginPanel、EvoPanel、Drawer。

## 擴充方式

- 新增「領域」：在後端加路由與 openclawSupabase 函式，必要時加表；在前端加 state、API 呼叫與 fallback，再加對應 Panel。  
- 新增「按鈕／操作」：在對應模組的 handler 與 openclawBoardApi 加一層，並在 UI 呼叫。
