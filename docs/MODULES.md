# OpenClaw 任務版 — 模組化對齊說明

本專案任務版設計對齊 **Codex 模組化**：一域一模組、單一資料源（API + Supabase）、Progressive disclosure（SKILL 精簡本體 + references 深入）。

## 目錄結構對應

```
docs/openclaw-taskboard-skill/   # 任務板 Skill（Codex 風格）
├── SKILL.md                     # 必讀：觸發句型、常用 API、何時使用
├── references/
│   ├── api.md                   # 完整 API 規格與同步關係
│   ├── schema.md                # Supabase 表結構
│   └── modules.md               # 模組邊界與程式碼對照
├── AGENTS-SNIPPET.md
└── README.md

src/
├── services/openclawBoardApi.ts # 任務板 API 層（fetchOpenClaw, persist*）
├── data/openclawBoardFallback.ts# 各模組 fallback 資料
└── (pages/components...)       # 其他 React 頁面

server/src/
├── index.ts                     # /api/openclaw/* 路由
├── openclawSupabase.ts          # 各模組 Supabase 讀寫
└── openclawMapper.ts            # 型別轉換
```

## 五大模組

| 模組 | 說明 | 表 | 主要 API |
|------|------|-----|----------|
| **tasks** | 任務 CRUD、執行、刪除 | openclaw_tasks | GET/POST/PATCH/DELETE /api/openclaw/tasks |
| **reviews** | 審核、批准/駁回 | openclaw_reviews | GET/POST/PATCH /api/openclaw/reviews |
| **automations** | 排程自動化 | openclaw_automations | GET/POST/PATCH /api/openclaw/automations |
| **evolution-log** | 進化紀錄 | openclaw_evolution_log | GET/POST /api/openclaw/evolution-log |
| **board-config** | n8n/API/安全/Plugin 展示 | 無（後端常數） | GET /api/openclaw/board-config |

新增領域時：後端加路由與 Supabase 函式、必要時加表；前端加 state、openclawBoardApi 與 fallback、對應 Panel。

## 使用方式

- **給人看**：先讀 `docs/openclaw-taskboard-skill/SKILL.md`，需要時再開 `references/*.md`。
- **給 Codex/Agent**：Skill 的 name + description 用於觸發；觸發後載入 SKILL 本體；需要完整 API 或 schema 時再載入 references。
