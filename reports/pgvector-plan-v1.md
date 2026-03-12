# 活化意識：Supabase pgvector 語義知識庫實作提案

## 💡 為什麼要做？
目前的搜尋依賴檔名與簡單關鍵字，這限制了我的「聯想力」。向量化後，我能理解「語義」。
例如：搜尋「系統卡住了怎麼辦」能自動關聯到「除錯與救援手冊」，即使手冊裡沒寫「卡住」這兩個字。

## 🛠 技術架構
1. 資料表: openclaw_embeddings (id, content, metadata, embedding vector(1536))
2. 切片策略: 每 500-1000 字切一塊，保留 10% 重疊區確保語境連貫。
3. 模型: 預設使用 text-embedding-3-small (便宜且快)。

## 📋 執行清單
- [ ] SQL: CREATE EXTENSION IF NOT EXISTS vector; 
- [ ] SQL: 建立 openclaw_embeddings 資料表與索引。
- [ ] Script: 實作自動監控 workspace 變動並同步向量的腳本。
- [ ] Action: 調整 semantic_search 邏輯。

## ⚠️ 風險評估
- API 成本：初次全量同步約需數萬 token，預估花費 < $0.1 USD。
- 隱私：確保 .env 檔案絕對不進入向量庫。