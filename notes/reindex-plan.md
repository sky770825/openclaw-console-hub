# 知識庫 Reindex 方案

> 日期：2026-03-03 | 作者：小蔡（Claude Opus 副手）

---

## 1. 目前 embedText 新格式

升級前（舊格式）：
```
section.slice(0, 500)
```
只取 section 前 500 字，無結構化 metadata。

升級後（新格式，目前代碼）：
```typescript
const embedText = `[${docTitle}] [${cat}] [${secTitle}] ${section.slice(0, 800)}`;
```

- **docTitle**：從 `# 標題` 提取，或用檔名
- **cat**：由 `guessCategoryFromPath()` 自動推斷（cookbook/sop/instruction/knowledge/docs/reports/...）
- **secTitle**：從 `## 標題` 提取
- **內容**：前 800 chars（從 500 提升到 800）

這個格式讓每個 embedding 向量同時攜帶「文件歸屬 + 類別 + 章節主題 + 內容摘要」，大幅提升語義搜尋的精準度。

---

## 2. rebuild 模式會做什麼

`reindex_knowledge` 支援兩種 mode：

### mode=append（預設）
- 掃描 workspace 下 13 個子目錄 + 根目錄的 .md 檔
- 用 upsert（onConflict: 'id'）寫入，同 id 的 chunk 會被覆蓋
- 不刪除已不存在的舊 chunks（會有殘留垃圾）

### mode=rebuild（完整重建）
1. **先清空**：`DELETE FROM openclaw_embeddings WHERE id >= 0`（刪除全部）
2. **掃描目錄**：`cookbook, memory, docs, reports, knowledge, notes, proposals, projects, learning, sop-知識庫, xiaocai-指令集, extensions, core, anchors`（共 14 個目錄）+ workspace 根目錄 .md
3. **逐檔處理**：
   - 讀取 .md 內容
   - 用 `## ` 切分 sections（過濾掉 < 50 chars 的）
   - 每個 section 用新格式組 embedText
   - 呼叫 `googleEmbed()` → Google gemini-embedding-001（768 維向量）
   - upsert 到 Supabase `openclaw_embeddings` 表
4. **節流**：每 10 個 chunk 暫停 200ms
5. **背景執行**：立刻回傳「已啟動」，實際索引在背景跑

---

## 3. 預估影響

### 檔案規模
- 掃描目錄中共 ~5955 個 .md 檔案 + ~16 個根目錄 .md
- 總計 ~5971 個檔案

### API 呼叫量
- 假設平均每檔 1-2 個 `##` section → 預估 6000~12000 次 Google Embedding API 呼叫
- 現有 6000+ chunks 表示實際約 6000~8000 次呼叫

### 時間預估
- 每次 Embedding API 呼叫約 100-300ms
- 每 10 chunks 暫停 200ms
- 預估總時間：**20~40 分鐘**（6000 chunks x 200ms avg + 節流 delay）

### 費用
- Google gemini-embedding-001：免費額度 1500 RPM / 每天 100 萬 tokens
- 每個 embedText 約 200-400 tokens（中文 800 chars）
- 總計約 200-400 萬 tokens → 可能需要 2-4 天的免費額度，或一次跑完會被 rate limit
- **風險**：如果超出免費額度，`googleEmbed()` 會返回 null，該 chunk 被跳過

### Supabase 影響
- rebuild 先 DELETE 全部 → 清空期間 semantic_search 無結果
- 重建期間搜尋結果會逐漸恢復
- 最終資料量不變（~6000 rows x 768 維向量）

---

## 4. 建議執行步驟

### 步驟 1：確認環境
```bash
# 確認 server 運行中
curl http://localhost:3011/api/health

# 確認 Google API Key 有效
# （server/.env 中 GOOGLE_API_KEY）
```

### 步驟 2：低峰時段執行
建議在老蔡不活躍的時段執行（如凌晨），因為：
- rebuild 會先清空所有 embeddings
- 重建期間 semantic_search 功能降級
- 大量 API 呼叫可能觸發 rate limit

### 步驟 3：觸發 rebuild
小蔡在 Telegram 發送：
```json
{"action":"reindex_knowledge","mode":"rebuild"}
```

### 步驟 4：監控進度
```bash
# 看 server log
tail -f ~/.openclaw/automation/logs/taskboard.log | grep ReindexKnowledge
```

### 步驟 5：驗證結果
```json
{"action":"semantic_search","query":"API 端點","limit":"3"}
```
確認搜尋結果回來、有正確的 category 標籤。

### 步驟 6：比對新舊
重建後可用 query_supabase 檢查：
```json
{"action":"query_supabase","table":"openclaw_embeddings","select":"category, count(*)","group_by":"category"}
```

---

## 5. 風險與緩解

| 風險 | 緩解方案 |
|------|---------|
| Rate limit 導致部分 chunk 跳過 | 完成後用 append 模式補跑一次 |
| 清空期間搜尋不可用 | 選擇低峰時段，或改用 append 模式（不清空） |
| 垃圾 chunks 殘留（append 模式） | 最終用 rebuild 做一次徹底清理 |
| 超時或 server 重啟 | 背景任務會中斷，需重新觸發 |

---

## 6. 替代方案：分批 append

如果不想一次性清空：
1. 用 `append` 模式執行 → 所有檔案用新格式 re-embed + upsert
2. 舊格式 chunks 被同 id 的新格式覆蓋
3. 已刪除檔案的舊 chunks 會殘留（可接受，不影響搜尋品質）
4. 好處：搜尋全程可用，無斷檔風險
