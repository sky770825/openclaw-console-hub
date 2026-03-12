## 後端架構分析 (server/src/index.ts)

- **框架**: Node.js + Express.js
- **主要中介層**: `cors`, `helmet`, `express-rate-limit`, 自訂驗證、認證、防火牆。
- **路由**: 模組化設計，按功能劃分 (tasks, projects, memory, openclaw-tasks 等)。
- **外部整合**: Supabase (主要資料庫), n8n (工作流程)。
- **核心業務邏輯**: 包含 Agent 執行器、工作流程引擎、自動執行器等進階功能。
- **結論**: 這是一個功能完整、結構清晰的後端 API 服務，為前端應用提供數據和業務邏輯支持。