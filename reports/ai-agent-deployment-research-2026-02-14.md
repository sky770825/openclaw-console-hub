# AI Agent 部署流程與 Codebase 溝通研究報告

> 研究日期：2026-02-14
> 研究範圍：部署平台與 AI Agent 溝通、Cursor/Claude Code 與 Codebase 互動機制

---

## 📋 執行摘要

經過大量閱讀與分析，我發現目前 AI Agent 與部署流程的溝通主要依賴四大開放協議：

| 協議 | 用途 | 關鍵特性 |
|------|------|----------|
| **MCP** (Model Context Protocol) | 工具與上下文存取 | JSON-RPC、安全工具調用 |
| **ACP** (Agent Communication Protocol) | 多 Agent 協作 | RESTful、異步串流、多模態 |
| **A2A** (Agent-to-Agent Protocol) | 企業級 Agent 協作 | Google 主導、Agent Card、任務管理 |
| **ANP** (Agent Network Protocol) | 去中心化 Agent 網路 | W3C DID、JSON-LD、開放網際網路 |

---

## 一、核心通訊協議深度分析

### 1.1 Model Context Protocol (MCP) - 工具層標準

**發起者**：Anthropic (2024)

**核心功能**：
- 提供標準化的 JSON-RPC 介面供 AI Agent 調用外部工具
- 支援安全的情境注入與結構化工具調用
- 被譽為「AI 的 USB-C 接口」

**在 Cursor/Claude Code 中的應用**：
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "xxx"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://..."
      }
    }
  }
}
```

**關鍵洞察**：
- Cursor 直接從本地機器與 MCP 伺服器通訊（stdio 或 SSE）
- Claude Code 支援每個子 Agent 獨立的 MCP 配置
- 工具搜尋與外掛捆綁伺服器是 Claude Code 的優勢

**文獻來源**：
- [Cursor MCP 官方文件](https://docs.cursor.com/context/model-context-protocol)
- [MCP for Developers - 整合工作流程](https://www.bishoylabib.com/posts/mcp-for-developers-integration-workflows)

---

### 1.2 Agent Communication Protocol (ACP) - 多 Agent 協作

**發起者**：IBM / Linux Foundation

**核心特性**：
- **REST-native**：使用標準 HTTP 模式，無需特殊 SDK
- **異步優先**：支援長時間執行的 Agent 任務
- **多模態**：透過 MimeTypes 支援任意資料格式（文字、圖片、音訊、影片）
- **離線發現**：Agent 可內嵌 metadata 到發布套件中

**關鍵洞察**：
- 與 BeeAI 框架深度整合
- 適合跨組織的 Agent 協作
- 企業級監控與可觀測性內建

**文獻來源**：
- [Agent Communication Protocol 官方](https://agentcommunicationprotocol.dev/)
- [IBM ACP 介紹](https://www.ibm.com/think/topics/agent-communication-protocol)

---

### 1.3 Agent2Agent Protocol (A2A) - 企業級標準

**發起者**：Google (2025年4月)

**合作夥伴**：50+ 科技與服務公司（Salesforce、SAP、ServiceNow、LangChain、MongoDB 等）

**設計原則**：
1. **擁抱 Agent 能力**：不將 Agent 限制為「工具」
2. **基於現有標準**：HTTP、SSE、JSON-RPC
3. **預設安全**：企業級認證與授權
4. **支援長時間任務**：從快速任務到數天的深度研究
5. **模態無關**：支援文字、音訊、視訊串流

**與 MCP 的關係**：
> "A2A 是一個開放協議，補充 Anthropic 的 Model Context Protocol (MCP)。MCP 提供工具和上下文給 Agent，而 A2A 解決我們在為客戶部署大規模多 Agent 系統時發現的挑戰。"
> — Google Developers Blog

**文獻來源**：
- [Google A2A 宣布文](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A 規範草案](https://github.com/google/A2A)

---

## 二、Cursor / Claude Code 與 Codebase 溝通機制

### 2.1 上下文管理比較

| 特性 | Claude Code | Cursor |
|------|-------------|--------|
| **Context Window** | 200K tokens（穩定） | 128K Normal / 200K Max（實際 70K-120K） |
| **超大上下文** | Opus 4.6 支援 1M token Beta | - |
| **程式碼庫理解** | Agentic 搜尋掃描整個專案 | Embeddings Index |
| **介面** | Terminal-first + VS Code 擴充 | VS Code fork（完整 IDE） |

### 2.2 AGENTS.md / CLAUDE.md - 關鍵溝通檔案

這是讓 AI Agent 理解 Codebase 的核心機制：

**檔案定位**：
- `AGENTS.md`：開放標準，支援多種 Agent（Cursor、Claude Code、Copilot、Codex）
- `CLAUDE.md`：Claude Code 專屬
- `.cursor/rules/`：Cursor 規則目錄

**AGENTS.md 核心區塊**：
```markdown
# AGENTS.md

## Do / Don't
- 使用 MUI v3，確保程式碼相容
- 使用 mobx 進行狀態管理
- 不要使用硬編碼顏色

## Commands
# 單一檔案檢查（推薦）
npm run tsc --noEmit path/to/file.tsx
npm run prettier --write path/to/file.tsx

## Project Structure
- 路由請看 `App.tsx`
- 元件放在 `app/components`
- 設計代幣在 `app/lib/theme/tokens.ts`
```

**CLAUDE.md 最佳實踐**（來自 HumanLayer）：
1. **Less is More**：少於 300 行，理想 60 行以內
2. **普遍適用性**：只放適用於所有任務的指令
3. **漸進揭露**：將特定任務說明放在獨立檔案
4. **不要替代 Linter**：程式碼風格交給自動化工具
5. **不要自動生成**：每行都應仔細思考

---

## 三、部署流程與 AI Agent 整合架構

### 3.1 理想部署溝通流程

```
AI Agent (部署編排器)
         │
         ├── AGENTS.md (專案知識)
         ├── MCP Servers (工具存取)
         │       ├── GitHub MCP
         │       ├── Vercel MCP
         │       └── Database MCP
         │
         └── 部署指令
                 │
                 ▼
         ┌──────────────┐
         │  GitHub Actions │
         │   (Orchestrator)│
         └──────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│ Build  │ │  Test    │ │ Deploy   │
└────────┘ └──────────┘ └──────────┘
```

### 3.2 MCP Server 配置範例

```json
{
  "mcpServers": {
    "vercel-deploy": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-vercel"],
      "env": {
        "VERCEL_TOKEN": "${VERCEL_TOKEN}"
      }
    },
    "github-actions": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

---

## 四、實施建議與最佳實踐

### 4.1 漸進採用路線圖

```
Phase 1: MCP 基礎建設
├── 部署 GitHub MCP Server
├── 配置資料庫 MCP Server
└── 建立基礎工具調用能力

Phase 2: ACP 多 Agent 協作
├── 建構 RESTful Agent 介面
├── 實作異步任務處理
└── 支援多模態訊息

Phase 3: A2A 企業級協作
├── 實作 Agent Card 發現機制
├── 建立任務管理流程
└── 整合現有企業系統
```

### 4.2 Codebase 溝通優化建議

1. **建立 AGENTS.md 作為單一真相源**
2. **採用階層式規則結構**（根目錄 + 子目錄）
3. **實作檔案級命令**（避免全專案建置）
4. **整合現有 DevOps 工具**（不讓 AI 做 Linter）

---

## 五、關鍵論文與資源

### 5.1 學術論文

1. **「A Survey of Agent Interoperability Protocols」** (ArXiv 2505.02279)
   - 比較 MCP、ACP、A2A、ANP 四大協議
   - 提出分階段採用路線圖
   - [連結](https://arxiv.org/html/2505.02279v1)

### 5.2 官方文件

1. **Cursor MCP 文件**：docs.cursor.com/context/model-context-protocol
2. **Google A2A 規範**：github.com/google/A2A
3. **Agent Communication Protocol**：agentcommunicationprotocol.dev
4. **AGENTS.md 標準**：agents.md

### 5.3 深度文章

1. **「How I Use Every Claude Code Feature」** - 關於 CLAUDE.md、Hooks、Subagents 的深度實踐
2. **「Writing a good CLAUDE.md」** - HumanLayer 的最佳實踐指南
3. **「Improve your AI code output with AGENTS.md」** - Builder.io 的實戰經驗

---

*報告整理完成，如需深入任何特定主題，請告訴我！*
