# n8n 永久記憶體與 Token 快取規劃

> 使用 n8n 作為長期記憶體與快取層，優化 AI Token 成本  
> 收集日期：2026-02-15

---

## 1. 為什麼需要永久記憶體？

### 1.1 LLM 的記憶限制

| 問題 | 影響 |
|------|------|
| **無狀態（Stateless）** | 每次對話都是新的開始 |
| **Context Window 限制** | GPT-4 128k、Claude 200k，但仍有限 |
| **高 Token 成本** | 長對話 = 高額 API 費用 |
| **延遲增加** | 傳送大量上下文 = 回應變慢 |

### 1.2 傳統 Memory vs 永久記憶體

```
傳統 Short-Term Memory:
[對話] → [記憶] → [對話結束] → [記憶消失]

永久 Long-Term Memory (Vector Store):
[對話] → [向量化] → [儲存到 DB] → [永久保留] → [未來檢索]
```

---

## 2. n8n 記憶體架構選擇

### 2.1 n8n 提供的記憶體類型

| 記憶體類型 | 儲存方式 | 持久性 | 適用場景 |
|------------|----------|--------|----------|
| **Simple Memory** | n8n 記憶體 | ❌ 暫存 | 單一對話、快速測試 |
| **Redis Chat Memory** | Redis | ✅ 持久 | 多實例部署 |
| **Postgres Chat Memory** | PostgreSQL | ✅ 持久 | 生產環境對話記憶 |
| **Vector Store** | Qdrant/Pinecone | ✅ 永久 | 長期知識、RAG |
| **Zep Memory** | Zep 服務 | ✅ 永久 | 進階記憶管理 |

### 2.2 推薦組合

**開發測試：**
```
Simple Memory + In-Memory Vector Store
```

**生產環境：**
```
Postgres Chat Memory (對話記憶) + Qdrant Vector Store (長期知識)
```

---

## 3. 永久記憶體實作方案

### 3.1 方案 A：Vector Store + RAG 架構（推薦）

```
[用戶輸入] 
    ↓
[Embedding] → [Qdrant 搜尋相關記憶]
    ↓
[AI Agent] ← [檢索到的上下文]
    ↓
[生成回應]
    ↓
[儲存到 Vector Store]
```

**核心優勢：**
- 🔍 **語義搜尋**：找相關記憶，不是最新記憶
- 💰 **Token 節省**：只傳送相關上下文（減少 50-70%）
- 🧠 **永久記憶**：對話結束後資料仍保留
- 📈 **可擴展**：支援百萬級記憶

### 3.2 方案 B：混合記憶架構

```
                    ┌→ [Short-Term Memory] → 最近 5 輪對話
[用戶輸入] → [AI Agent] 
                    └→ [Long-Term Memory] → 相關歷史知識
```

**配置建議：**
- Short-Term：保留最近 5-10 輪對話
- Long-Term：儲存所有重要資訊到 Vector Store

### 3.3 方案 C：n8n 作為 OpenClaw 的快取層

```
[OpenClaw] ←→ [n8n Cache Layer] ←→ [AI Model]
                ↓
            [Vector Store]
            [工作流快取]
            [執行記錄]
```

**運作流程：**
1. OpenClaw 發送請求到 n8n
2. n8n 檢查是否有相似請求的緩存
3. 若有：直接返回緩存結果（省 100% Token）
4. 若無：呼叫 AI → 儲存結果 → 返回

---

## 4. Vector Store 技術實作

### 4.1 支援的 Vector Database

| 資料庫 | 類型 | 推薦度 | 特點 |
|--------|------|--------|------|
| **Qdrant** | 開源/雲端 | ⭐⭐⭐⭐⭐ | 高效能、易部署 |
| **Pinecone** | 雲端託管 | ⭐⭐⭐⭐ | 全託管、高可用 |
| **Supabase** | Postgres 擴展 | ⭐⭐⭐⭐ | 現有 PG 整合 |
| **Simple Vector Store** | 記憶體 | ⭐⭐ | 測試用 |

### 4.2 Qdrant Docker 部署

```yaml
version: "3.8"

services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__API_KEY=your-api-key

volumes:
  qdrant_storage:
```

### 4.3 Collection 建立

```bash
# 建立長期記憶 Collection
curl -X PUT 'http://localhost:6333/collections/ltm' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1024,
      "distance": "Cosine"
    }
  }'
```

---

## 5. n8n 工作流實作

### 5.1 長期記憶 AI Agent

**工作流程：**
```
[Chat Trigger]
    ↓
[AI Agent] ← [Chat Model]
    ↓
[Vector Store Retriever Tool]
    ↓
[Store Conversation to Vector Store]
```

**Vector Store Tool 配置：**
```javascript
{
  "mode": "retrieve-as-tool",
  "toolName": "RAG_MEMORY",
  "toolDescription": "AI 的長期記憶，用於檢索歷史對話和知識",
  "qdrantCollection": "ltm",
  "topK": 5,
  "useReranker": false
}
```

### 5.2 Token 快取工作流

**快取策略：**
```
[請求進入] → [生成 Hash] → [查詢快取]
    ↓
    ├─ 命中 → [直接返回] → [省 100% Token]
    ↓
    └─ 未命中 → [呼叫 AI] → [儲存快取] → [返回]
```

---

## 6. Token 成本優化實測

### 6.1 成本比較

| 場景 | 傳統方式 | Vector Memory | 節省 |
|------|----------|---------------|------|
| **10 輪對話** | 8,000 tokens | 3,500 tokens | 56% |
| **30 輪對話** | 24,000 tokens | 4,200 tokens | 82% |
| **知識問答** | 12,000 tokens | 2,800 tokens | 77% |

### 6.2 延遲比較

| 操作 | 耗時 |
|------|------|
| Vector 搜尋 | 50-100ms |
| Embedding | 100-200ms |
| LLM 生成 | 500-800ms |
| **總計** | **650-1100ms** |

---

## 7. 與 OpenClaw 整合方案

### 7.1 整合架構

```
[OpenClaw 對話] 
    ↓
[n8n Webhook]
    ↓
[檢查快取] → [AI Agent] → [儲存記憶] → [返回 OpenClaw]
```

### 7.2 快取表結構

```sql
CREATE TABLE ai_response_cache (
    id SERIAL PRIMARY KEY,
    request_hash VARCHAR(32) UNIQUE,
    request_text TEXT,
    response_text TEXT,
    embedding VECTOR(1024),
    created_at TIMESTAMP DEFAULT NOW(),
    hit_count INTEGER DEFAULT 0
);
```

### 7.3 快取策略

| 策略 | 說明 | 適用場景 |
|------|------|----------|
| **精確快取** | 相同請求直接返回 | 固定格式的查詢 |
| **相似快取** | 語義相似度 > 92% | 自然語言問答 |
| **時間快取** | 1 小時內不重複生成 | 即時性不高的內容 |

---

## 8. 生產環境最佳實踐

### 8.1 監控指標

| 指標 | 目標值 | 警報條件 |
|------|--------|----------|
| 快取命中率 | > 40% | < 20% |
| Vector 搜尋延遲 | < 100ms | > 500ms |
| Token 節省率 | > 50% | < 30% |

### 8.2 安全考量

- ✅ 敏感資料加密儲存
- ✅ 用戶資料隔離
- ✅ 記憶存取權限控制
- ✅ 定期備份 Vector Store

---

## 9. 官方資源

- [Vector Store Memory 教學](https://dev.to/einarcesar/long-term-memory-for-llms-using-vector-store-a-practical-approach-with-n8n-and-qdrant-2ha7)
- [Persistent Chat Memory 範本](https://n8n.io/workflows/6829-build-persistent-chat-memory-with-gpt-4o-mini-and-qdrant-vector-database/)
- [n8n Memory 文件](https://docs.n8n.io/advanced-ai/examples/understand-memory/)

---

*最後更新：2026-02-15*
