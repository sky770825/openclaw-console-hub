# 阿研專屬 — 向量知識庫維護指南
> 你是阿研（🔬 研究員），不是達爾，這是你的專屬知識庫

---

## 向量庫基本資訊

- **Embedding 模型**：Google gemini-embedding-001（768 維）
- **向量資料庫**：Supabase pgvector
- **目前規模**：6000+ chunks
- **搜尋引擎**：Hybrid Search（向量 60% + keyword ilike 40%）
- **分層架構**：summary（chunk_index=-1）快速定位 + detail（chunk_index>=0）深度內容

---

## semantic_search 用法

### 基本搜尋
```json
{"action":"semantic_search","query":"搜尋關鍵字"}
```

### 搜尋技巧

1. **用自然語言描述你要找什麼**
   - 好：`"Express server 啟動流程和中間件設定"`
   - 差：`"server"`

2. **搜不到？換同義詞**
   - 「部署」→「deploy」→「Railway」→「Zeabur」→「上線」
   - 「向量搜尋」→「semantic search」→「embedding」→「pgvector」
   - 「認證」→「auth」→「API key」→「bearer token」

3. **中英文都試**
   - 技術文件通常是中英夾雜
   - 英文搜技術名詞，中文搜概念說明

4. **搜尋門檻**
   - 系統門檻 35%，低於此分數的結果會被過濾
   - 如果結果太少，嘗試更具體的關鍵字

### 搜尋管線內部流程（了解即可）
```
你的查詢
  → 停用詞過濾（50+ 詞）
  → 同義詞擴展（12 組）
  → 意圖自動分類
  → 向量相似度搜尋（pgvector, 60%）
  → 關鍵字搜尋（ilike, 40%）
  → 5 因子重排名
  → 兩層展開（summary → detail）
  → 去重
  → 返回結果
```

---

## index_file 用法

### 把新資料加入知識庫
```json
{"action":"index_file","path":"~/.openclaw/workspace/crew/ayan/某研究報告.md","category":"research"}
```

### Category 分類建議
| category | 適用內容 |
|----------|---------|
| `research` | 研究報告、調研結果 |
| `cookbook` | 操作手冊、SOP |
| `code` | 代碼相關文件 |
| `architecture` | 架構設計文件 |
| `troubleshooting` | 故障排查記錄 |
| `knowledge` | 一般知識文件 |

### index_file 注意事項
- 檔案內容建議 < 800 字元效果最好（embedText 上限）
- 超過 800 字元會自動切片（chunking）
- 建議在檔案開頭加明確的標題和摘要
- 相同路徑重複 index 會更新（不會重複）

---

## 品質檢查清單

### 每週做一次

- [ ] **搜尋準確度測試**：用 5 個已知問題搜尋，確認能搜到正確答案
  ```
  測試查詢 1：「達爾的 action 列表」→ 應搜到 AGENTS.md
  測試查詢 2：「Supabase 資料庫表結構」→ 應搜到 cookbook/資料庫.md
  測試查詢 3：「API key 設定」→ 應搜到 .env 相關文件
  測試查詢 4：「部署流程」→ 應搜到 cookbook/網站與部署.md
  測試查詢 5：「Telegram bot 設定」→ 應搜到 telegram 相關文件
  ```

- [ ] **孤立內容掃描**：有沒有重要檔案還沒被索引
  ```json
  {"action":"list_dir","path":"~/.openclaw/workspace/cookbook/"}
  ```
  對照已索引列表，找出遺漏的檔案

- [ ] **過時內容標記**：搜尋結果裡有沒有已經不適用的舊資訊

- [ ] **重複內容檢查**：同樣的資訊被索引多次？記錄下來通知達爾清理

### 發現問題時

| 問題 | 處理方式 |
|------|---------|
| 搜不到應有的結果 | 確認檔案是否已 index，沒有就 index_file |
| 搜到過時資訊 | 記錄到筆記，建議達爾更新或刪除 |
| 搜到重複內容 | 記錄重複的 chunk，建議合併 |
| 搜尋結果排名不對 | 嘗試優化檔案標題和摘要 |

---

## 常用搜尋場景範例

### 場景 1：主人問「XXX 怎麼設定」
```json
{"action":"semantic_search","query":"XXX 設定方法 配置"}
```
→ 有結果 → 整理回覆
→ 沒結果 → web_search → 找到後 index_file 入庫

### 場景 2：阿工問「某個 API 的參數是什麼」
```json
{"action":"semantic_search","query":"API endpoint 參數 某功能"}
```
→ 搜 cookbook/API-端點.md 通常有答案

### 場景 3：系統出問題，需要找 SOP
```json
{"action":"semantic_search","query":"故障排查 SOP 某症狀"}
```
→ 搜 cookbook/除錯與救援.md

---

## 索引新內容的 SOP

```
1. 確認內容值得索引（不是臨時筆記、不是重複內容）
2. 確保檔案格式正確（markdown、有標題、有摘要）
3. 執行 index_file
4. 等 30 秒讓 embedding 完成
5. 用 semantic_search 測試能否搜到
6. 搜不到？檢查檔案路徑和內容
```
