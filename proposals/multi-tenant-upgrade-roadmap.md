# OpenClaw 多租戶升級路徑 (SaaS 準備)

## 1. 資料庫層 (Database Layer)
- [ ] 新增 tenants 管理表。
- [ ] 在所有核心表 (tasks, runs, memory, evolution_log) 新增 tenant_id (UUID)。
- [ ] 啟用 Supabase RLS (Row Level Security)，根據 JWT 中的 tenant_id 自動過濾資料。

## 2. 記憶層 (Memory Layer)
- [ ] pgvector 查詢語法升級：WHERE tenant_id = '...'。
- [ ] 實作「系統級知識」與「租戶級知識」的混合檢索邏輯。

## 3. 指揮層 (Orchestration Layer)
- [ ] 修改 create_task Action，自動注入發起者的 tenant_id。
- [ ] 升級 Agent Protocol v1.1，加入 tenant_context。

## 4. 認證層 (Auth Layer)
- [ ] 從靜態 API Key 轉向 Supabase Auth (JWT)。
- [ ] 實作分層權限：Admin (老蔡) vs User (客戶)。