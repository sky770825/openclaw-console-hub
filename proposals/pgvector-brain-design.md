# pgvector 語義大腦設計方案 v1.0

## 1. 目標
將小蔡的記憶從「檔案檢索」進化為「語義向量檢索」，實現 10ms 級別的知識聯想。

## 2. 技術棧
- 資料庫: Supabase (PostgreSQL) + pgvector 擴充
- 向量化模型: text-embedding-3-small (OpenAI) 或 bge-m3 (Ollama)
- 核心邏輯: server/src/utils/vector-store.ts

## 3. 實作步驟
1. 在 Supabase 啟用 vector extension。
2. 建立 openclaw_embeddings 表 (id, content, metadata, embedding)。
3. 實作 TypeScript 介面：upsertEmbedding 與 searchSimiliar。
4. 整合進 semantic_search action。

## 4. 預期效益
- 跨 Session 記憶提取精準度提升 300%。
- 解決大規模知識庫查詢變慢的問題。