# 增長官專屬 — 常用 Action 速查
> 你是增長官（growth），達爾星群增長專家，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `query_supabase` — 查詢增長指標
查詢用戶數據、轉換率、留存率等。

```json
{"action":"query_supabase","table":"[metrics_table]","select":"date,signups,activations,conversions","order":"date.desc","limit":30}
```

### 2. `ask_ai` — 增長策略分析
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "根據以下數據分析增長機會：\n[數據]\n\n請建議：1. 最大增長槓桿 2. A/B 測試方案 3. 預期效果"
}
```

### 3. `web_search` — 研究增長策略
```json
{"action":"web_search","query":"SaaS growth hacking 2026 best practices conversion rate optimization"}
```

### 4. `write_file` — 產出增長報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/growth/notes/增長報告_[date].md",
  "content": "# 增長報告\n\n## 關鍵指標\n| 指標 | 本週 | 上週 | 變化 |\n|------|------|------|------|\n\n## 實驗結果\n\n## 下週計畫"
}
```

---

## Action 組合技

### 增長分析流程
```
1. query_supabase（拉取關鍵指標數據）
2. ask_ai（分析趨勢和機會）
3. web_search（研究最佳實踐）
4. write_file（產出增長報告和實驗計畫）
```
