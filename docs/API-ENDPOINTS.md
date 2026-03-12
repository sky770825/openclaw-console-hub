# API-ENDPOINTS.md - 任務板/專案製作 API 索引

## 任務板後端 API (Port 3011)

| 功能 | 方法 | 端點 | 說明 |
|------|------|------|------|
| 任務列表 | GET | `/api/tasks` | 取得所有任務 |
| 建立任務 | POST | `/api/tasks` | 建立新任務 |
| 更新任務 | PATCH | `/api/tasks/:id/progress` | Agent回報進度 |
| 執行紀錄 | GET | `/api/runs` | 任務執行歷史 |

## OpenClaw 專案製作 API (Port 3011)

| 功能 | 方法 | 端點 | 說明 |
|------|------|------|------|
| 專案列表 | GET | `/api/openclaw/projects` | 取得所有專案 |
| 建立專案 | POST | `/api/openclaw/projects` | 建立新專案 |
| 更新專案 | PATCH | `/api/openclaw/projects/:id` | 更新專案內容 |
| 刪除專案 | DELETE | `/api/openclaw/projects/:id` | 刪除專案 |

## AutoExecutor 自動執行 API

```bash
# 啟動自動執行器
curl -X POST http://localhost:3011/api/openclaw/auto-executor/start \
  -H "Content-Type: application/json" \
  -d '{"pollIntervalMs": 10000}'

# 停止自動執行器
curl -X POST http://localhost:3011/api/openclaw/auto-executor/stop

# 查詢狀態
curl http://localhost:3011/api/openclaw/auto-executor/status

# 健康檢查
curl http://localhost:3011/health
```

## 專案資料結構

```typescript
{
  id: string;              // 專案ID (如 proj-skillforge-001)
  title: string;           // 專案名稱
  description: string;     // 專案描述
  status: 'planning' | 'in_progress' | 'done' | 'paused';
  progress: number;        // 0-100
  phases: { id, name, done }[];  // 執行階段
  notes: string;           // 備註
}
```

## 快速指令

```bash
# 查詢專案列表
curl -s http://localhost:3011/api/openclaw/projects

# 建立專案
curl -s -X POST http://localhost:3011/api/openclaw/projects \
  -H "Content-Type: application/json" \
  -d '{"id":"proj-xxx","title":"名稱","status":"planning"}'
```

## 腳本工具

```bash
./scripts/task-board-api.sh list-tasks              # 列任務
./scripts/task-board-api.sh get-task <id>           # 任務詳情
./scripts/task-board-api.sh run-task <taskId>       # 立即執行
./scripts/task-board-api.sh list-runs [taskId]      # 執行紀錄
./scripts/task-board-api.sh get-run <runId>         # Run 詳情
./scripts/task-board-api.sh rerun <runId>           # 重跑
./scripts/task-board-api.sh add-task <name> [desc]  # 新增任務
./scripts/task-board-api.sh update-task <id> <name> [desc]  # 更新任務
```
