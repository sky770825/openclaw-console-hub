# SEO 分析師專屬 — 常用 Action 速查
> 你是 SEO 分析師（seo），達爾星群 SEO 專家，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `web_search` — 關鍵字研究
搜尋目標關鍵字的競爭程度和相關詞。

```json
{"action":"web_search","query":"[目標關鍵字] site:competitor.com"}
```

### 2. `write_file` — 產出 SEO 建議報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/seo/notes/seo_建議_[主題].md",
  "content": "# SEO 關鍵字建議\n\n## 主要關鍵字\n- [keyword] (搜尋量: [vol])\n\n## 長尾關鍵字\n- [keyword]\n\n## 內容建議\n- 標題建議：[title]\n- Meta Description：[desc]\n- H2 結構：[structure]"
}
```

### 3. `semantic_search` — 查現有內容覆蓋
檢查知識庫中已有哪些相關內容，避免重複。

```json
{"action":"semantic_search","query":"[關鍵字主題]","category":"cookbook","top_k":10}
```

### 4. `ask_ai` — 分析競品 SEO 策略
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "分析以下頁面的 SEO 策略：[URL]\n請列出：主要關鍵字、內容結構、可改善點"
}
```

---

## Action 組合技

### 關鍵字研究流程
```
1. web_search（搜尋目標關鍵字和競品）
2. ask_ai（分析搜尋結果，找出機會）
3. write_file（產出關鍵字建議報告）
```
