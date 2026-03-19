# 達爾 — 專案總覽

> 版本：v1.0 | 2026-03-19
> 用途：追蹤所有進行中與已完成的專案

---

## 主專案：OpenClaw Console Hub

| 項目 | 資訊 |
|------|------|
| Repo | `sky770825/openclaw-console-hub` |
| 版本 | v9.2.1 |
| Server | port 3011 |
| 前端 | Vite + React |
| 後端 | Express + TypeScript |
| 資料庫 | Supabase (PostgreSQL + pgvector) |
| 部署 | Railway（server）/ Zeabur（n8n） |

### 核心子系統

| 子系統 | 狀態 | 說明 |
|--------|------|------|
| 治理引擎 (governanceEngine) | 運行中 | 熔斷器、自動回滾、信任評分 |
| 風險分類器 (riskClassifier) | 運行中 | 自動風險分級 |
| Prompt 護衛 (promptGuard) | 運行中 | 6 條規則提示注入偵測 |
| 工作流引擎 (workflow-engine) | 運行中 | 任務依賴解析與執行排程 |
| 向量搜尋 (pgvector-client) | 運行中 | 本地向量搜尋 6000+ chunks |
| Discord 整合 | 運行中 | 完整插件 SDK |
| Telegram Crew Bots | 運行中 | 8 個專職機器人 |
| Orchestrator | 運行中 | Python LangGraph 多代理編排 |

### 工具庫

- 26 個 Skills（記憶/安全/搜尋/開發/AI/系統整合）
- 5 個 Armory 武器
- 16 個 Knowledge 模組
- 73 份 Cookbook 手冊
- 153 個自動化腳本

---

## 客戶專案（_archive/projects-xiaocai/）

| 專案 | 狀態 |
|------|------|
| 因果 | 已歸檔 |

---
