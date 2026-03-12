# PROJECT-CONTEXT.md

> 原 AGENTS.md、TOOLS.md 的內容已合併至此
> 此檔案 **不自動載入**，需要時用 `read` 工具讀取

## 啟動流程
1. 讀 `SOUL.md` → `USER.md` → `MEMORY.md`
2. 其他檔案 **按需讀取**
3. 記憶：深層 `./scripts/memory_recall.js`

## 核心規則
- 主會話 = 指揮官：理解 → spawn 子 Agent → 彙整
- >5 步工具 → `sessions_spawn()`
- 長任務結果 → 寫入外部檔案
- Context 70% → `./scripts/checkpoint.sh` + 建議 `/new`

## 記憶寫入前執行
`./scripts/memfw-scan.sh '<內容>' quick` → BLOCK/REVIEW/PASS

## 模型選擇
| 任務 | 模型 |
|------|------|
| 簡單/監控 | Ollama |
| 研究 | Sonnet 4.5 |
| 長文本 | Gemini Flash |
| 重大決策 | Opus 4.6 |

## 任務板 (localhost:3011)
```bash
./scripts/task-board-api.sh list-tasks
./scripts/task-board-api.sh run-task <id>
./scripts/task-board-api.sh get-run <id>
```

## AutoExecutor
```bash
curl http://localhost:3011/api/openclaw/auto-executor/status
curl -X POST http://localhost:3011/api/openclaw/auto-executor/start
```

## 常用
| 用途 | 指令/連結 |
|------|----------|
| 省 Token | https://claude.ai |
| 問 Cursor | `./scripts/ask-cursor-cli.sh "問題" "路徑"` |
| 桌面 | `~/Desktop` |

## 技能
必帶: healthcheck, playwright-scraper, screen-vision, session-logs, github, tavily-search

詳見 `docs/TECH-PATTERNS.md`
