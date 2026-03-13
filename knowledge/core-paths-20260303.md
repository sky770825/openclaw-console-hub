# OpenClaw 核心路徑清單 (2026-03-03)

## 1. 達爾意識核心 (Xiao Cai Brain)
路徑: server/src/telegram/dar-think.ts 
用途: 定義 System Prompt、知識分層、模型路由。

## 2. OpenClaw 系統核心 (System Core)
路徑: server/src/index.ts 
用途: 後端入口、API 路由掛載、Bot 啟動。

## 3. 其他關鍵組件
- 資料庫層: server/src/openclawSupabase.ts 
- 任務代理: server/src/executor-agents.ts