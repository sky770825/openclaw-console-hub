# AI Agent 溝通實戰指南

> 適用工具：Code (Claude Code) / Desk / Cursor + MCP
> 版本：精華濃縮版

---

## 🎯 核心原則

```
「溝通品質 = Agent 輸出品質」
```

Agent 是無狀態的——每次對話都是從零開始。你給的上下文決定它如何理解專案。

---

## 📁 檔案層級溝通架構

### 1. 根目錄核心檔案

```
project/
├── AGENTS.md           ← 主要溝通檔（所有工具通用）
├── CLAUDE.md           ← Claude Code 專用（可 symlink 到 AGENTS.md）
├── .cursor/
│   └── rules/          ← Cursor 規則目錄
└── .vscode/
    └── mcp.json        ← MCP 伺服器配置
```

### 2. AGENTS.md 精簡模板

```markdown
# AGENTS.md

## 專案概覽
- **技術棧**: React + TypeScript + Node.js
- **架構**: Monorepo (apps/web, apps/api, packages/shared)
- **部署**: Vercel (frontend) + Railway (backend)

## Do
- 使用 TypeScript 嚴格模式
- 遵循現有程式碼風格（參考 `apps/web/components/Button.tsx`）
- 單一檔案變更後立即執行 `npm run lint:file <path>`

## Don't
- 不要新增未經批准的依賴
- 不要在元件內直接 fetch，使用 `packages/api/client.ts`
- 不要使用硬編碼顏色，使用 theme tokens

## 常用命令
```bash
# 單一檔案檢查（快）
npm run lint:file path/to/file.ts
npm run typecheck:file path/to/file.ts
npm run test:file path/to/file.test.ts

# 完整建置（慢，謹慎使用）
npm run build
```

## 專案結構
- `apps/web` - Next.js 前端
- `apps/api` - Express API
- `packages/shared` - 共用類型與工具
- `packages/ui` - 共用元件庫

## 範例參考
- ✅ 好範例：`apps/web/components/Modal.tsx`（functional + hooks）
- ❌ 避免：`apps/web/pages/OldPage.tsx`（class component）

## MCP 工具使用
- **GitHub**: 讀取 issues、建立 PR
- **Database**: 查詢資料表結構（唯讀）
- **Vercel**: 部署預覽環境

## 安全權限
- ✅ 無需確認：讀取檔案、單一檔案 lint/typecheck
- ⚠️ 需確認：安裝依賴、git push、刪除檔案、完整建置
```

---

## 🔌 MCP 溝通配置

### 標準配置檔 `.vscode/mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "vercel": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-vercel"],
      "env": {
        "VERCEL_TOKEN": "${VERCEL_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

### Claude Code 配置 `~/.claude/CLAUDE.md`

```markdown
# Claude Code 專案溝通指南

## 工作流程
1. 每次任務先讀取 `AGENTS.md`
2. 變更前確認相關檔案結構
3. 優先使用單一檔案命令驗證
4. 完成後總結變更並詢問是否提交

## 子 Agent 使用時機
- 並行處理獨立檔案時啟用
- 複雜研究任務委派給 Task 工具
- 保持主 Agent 上下文整潔

## Git 工作流
```bash
# 建立功能分支
git checkout -b feat/$(date +%s)

# 提交訊息格式
feat(scope): 簡短描述
```
```

---

## 🖥️ Cursor 溝通配置

### `.cursor/rules/general.mdc`

```markdown
---
description: 通用開發規則
globs: "**/*"
---

# Cursor 開發規則

## 程式碼風格
- 優先使用 functional components
- Props 使用 interface 定義
- 非同步操作使用 try/catch

## Agent 行為
- 變更前先提出計畫
- 多檔案變更時逐步執行
- 遇到錯誤時暫停並報告

## 測試
- 新增功能必須包含測試
- 使用現有測試作為參考範例
```

### 規則分層結構

```
.cursor/rules/
├── general.mdc          # 通用規則（Always）
├── frontend.mdc         # 前端特定（Auto Attached: **/*.{tsx,jsx}）
├── backend.mdc          # 後端特定（Auto Attached: **/*.{ts,js} api/）
└── database.mdc         # 資料庫規則（Agent Requested）
```

---

## 🔄 跨工具溝通策略

### 1. 單一真相源原則

```bash
# AGENTS.md 作為主檔案
# CLAUDE.md 和 .cursor/rules 都指向它

# CLAUDE.md 內容：
嚴格遵循 ./AGENTS.md 的規則

# .cursor/rules/general.mdc 內容：
參考 ../AGENTS.md 的專案結構與規範
```

### 2. 上下文管理對比

| 場景 | Claude Code | Cursor |
|------|-------------|--------|
| 大規模重構 | ✅ 200K 穩定上下文 | ⚠️ 70-120K 實際可用 |
| 快速編輯 | ⚠️ 需終端操作 | ✅ Tab 補全 + 視覺回饋 |
| 自動化部署 | ✅ CLI 原生支援 | ⚠️ 需額外配置 |
| 多檔案協作 | ✅ Subagents | ✅ Background agents |

### 3. 分工建議

```
Claude Code：
├── 大規模重構（>20 檔案）
├── CI/CD 自動化
├── 複雜邏輯分析
└── 長時間任務（>30 分鐘）

Cursor：
├── 日常開發編輯
├── UI 調整與除錯
├── 快速原型開發
└── 視覺化程式碼審查
```

---

## 💡 實戰溝通技巧

### 1. 提示詞模板

```markdown
## 任務提示詞結構

**背景**：
- 我們正在實作 [功能名稱]
- 相關檔案：[檔案路徑列表]

**需求**：
- [具體需求描述]
- 參考範例：[好範例檔案路徑]

**限制**：
- 使用 [技術/模式]
- 不要 [禁止事項]
- 必須 [必要條件]

**驗證**：
- 執行 [測試/命令] 確認正常
```

### 2. 漸進式上下文揭露

```markdown
# 不要一次給全部資訊

❌ 錯誤：
「實作使用者認證，參考這 10 個檔案...」

✅ 正確：
「實作使用者認證：
1. 先看 AGENTS.md 了解專案結構
2. 參考 `apps/api/auth/` 現有實作
3. 如需更多上下文，我會提供」
```

### 3. 驗證優先 workflow

```bash
# 變更後立即驗證的順序

1. 單一檔案 lint
   npm run lint:file <changed-file>

2. 單一檔案 typecheck
   npm run typecheck:file <changed-file>

3. 相關測試
   npm run test:file <changed-file>.test.ts

4. （可選）完整建置
   npm run build
```

---

## 🚀 快速啟動檢查清單

### 新專案設定

- [ ] 建立 `AGENTS.md`（< 300 行）
- [ ] 設定 MCP 伺服器（GitHub、部署平台、資料庫）
- [ ] 建立 `.cursor/rules/` 目錄結構
- [ ] 設定 Claude Code hooks（如需要）
- [ ] 建立單一檔案命令腳本

### 每日 workflow

- [ ] 啟動時確認 AGENTS.md 已載入
- [ ] 大任務先問計畫再執行
- [ ] 使用單一檔案命令驗證
- [ ] 定期 `/compact` 或重新啟動對話

---

## 📚 延伸資源

| 主題 | 連結 |
|------|------|
| AGENTS.md 標準 | https://agents.md |
| Cursor Rules | https://docs.cursor.com/context/rules |
| Claude Code 文件 | https://docs.anthropic.com/claude-code |
| MCP 規範 | https://modelcontextprotocol.io |

---

*本指南持續迭代，根據實際使用經驗更新*
