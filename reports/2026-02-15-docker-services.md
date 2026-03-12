# Docker 服務用途記錄
日期: 2026-02-15

## n8n 生態系服務

| 服務 | Port | 用途 | 狀態 |
|------|------|------|------|
| Postgres | 5432 | n8n 主要資料庫，存 workflows、執行紀錄、用戶資料 | ✅ 使用中 |
| Redis | 6379 | 快取 + 任務隊列，大量 workflow 時排程緩存 | ⚠️ 待確認 |
| Qdrant | 6333 | 向量資料庫，AI/RAG/相似度搜尋 | ❌ 目前閒置 |

## 管理工具

| 服務 | Port | 用途 | 安裝日期 |
|------|------|------|----------|
| Portainer | 9000 | Docker 管理界面 | 2026-02-15 |
| Uptime Kuma | 3001 | 服務監控 + Telegram 告警 | 2026-02-15 |
| Vaultwarden | 8080 | 自架密碼管理器 | 2026-02-15 |

## Qdrant 潛在用途

- 存文件向量（PDF/網頁內容）
- AI RAG 檢索增強
- 相似內容搜尋
- 與 n8n AI workflow 整合

## 備註

- n8n 網址: http://localhost:5678
- n8n 帳號: (見 ~/n8n-production/.env)
- SSH remote: git@github.com:sky770825/openclaw-console-hub.git
