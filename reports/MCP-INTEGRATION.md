# [P0] OpenClaw MCP 協議整合與商機研發

## 1. 可行性研究 (Feasibility Study - 2026/02)

### 1.1 MCP 簡介
MCP (Model Context Protocol) 是一個開放協議，旨在標準化 AI Agent 與外部資料源及工具（Server）之間的通訊。它將工具定義（Tools）、資源（Resources）和提示（Prompts）從模型邏輯中解耦。

### 1.2 技術選型
根據 2026 年的主流生態，我們選擇以下技術路徑進行 OpenClaw 接入：
- **SDK**: `@modelcontextprotocol/sdk` (Node.js 版)。
- **傳輸層**: `StdioClientTransport` (用於本地 MCP Server) 與 `SSEClientTransport` (用於遠端服務)。
- **整合模式**: 將 MCP Tools 動態轉換為 OpenClaw 可識別的 `Skills` 或 `Tools` 映射。

---

## 2. 核心接入原型 (Prototype)

### 2.1 基礎 Client 結構 (Node.js)
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function connectToMCPServer(command, args) {
  const transport = new StdioClientTransport({ command, args });
  const client = new Client({ name: "OpenClaw-MCP-Bridge", version: "1.0.0" });
  
  await client.connect(transport);
  
  // 列出所有可用工具
  const tools = await client.listTools();
  console.log("發現 MCP 工具:", tools);
  
  return { client, tools };
}
```

### 2.2 OpenClaw 整合路徑
我們將建立一個 `MCP-Bridge` 模組，放在 `projects/openclaw/modules/infra/mcp-bridge/`，其功能包括：
1. **自動掃描**: 掃描 `~/.openclaw/config/mcp-servers.json` 中的配置。
2. **工具映射**: 將 MCP Tool 定義轉換為 OpenClaw 的 `tool_definition` 格式。
3. **動態執行**: 當 Agent 調用 MCP 工具時，Bridge 負責與對應的 MCP Server 通訊並回傳結果。

---

## 3. 商業商機 (Business Opportunities)

### 3.1 「萬能插頭」服務
- **點子**: 為企業提供「MCP Ready」的 OpenClaw 部署。
- **優勢**: 企業現有的私有工具（只要符合 MCP）可以秒速接入 OpenClaw，無需二次開發。

### 3.2 垂直領域 MCP Server 販售
- **點子**: 開發針對「台灣biz_realestate實價登錄」或「特定 POS 系統」的 MCP Server。
- **獲利**: 以插件形式在 Clawhub 或自有平台販售。

---

## 4. 下一步行動 (Next Steps)
1. [ ] 建立 `projects/openclaw/modules/infra/mcp-bridge/` 目錄。
2. [ ] 撰寫第一版 `mcp-bridge.mjs`。
3. [ ] 接入一個測試用 MCP Server (如 `filesystem`) 並驗證。

---
**執行者**: 小蔡 (L1) & L2 指引
**日期**: 2026-02-19
**狀態**: 原型設計完成，準備進入開發。
