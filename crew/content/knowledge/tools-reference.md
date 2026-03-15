# 內容創作官專屬 — 常用 Action 速查
> 你是內容創作官（content），達爾星群內容專家，這是你的專屬知識庫

---

## 你最常用的 5 個 Action

### 1. `write_file` — 撰寫內容
產出文章、貼文、腳本等內容。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/content/notes/article_[主題].md",
  "content": "# [標題]\n\n[正文內容]"
}
```

### 2. `semantic_search` — 搜尋靈感素材
從知識庫找相關素材和過往內容。

```json
{"action":"semantic_search","query":"[主題關鍵字]","top_k":5}
```

### 3. `web_search` — 研究主題
搜尋主題的最新資訊和趨勢。

```json
{"action":"web_search","query":"[主題] 趨勢 2026"}
```

### 4. `read_file` — 讀取素材和參考
讀取 journal 提供的素材、SEO 建議等。

```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/seo/notes/keywords_[主題].md"}
```

### 5. `ask_ai` — 潤稿和風格調整
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "請潤飾以下文章，保持專業但親切的語調：\n[草稿內容]"
}
```

---

## Action 組合技

### 文章撰寫流程
```
1. read_file（讀取 SEO 關鍵字建議）
2. read_file（讀取 journal 提供的素材）
3. web_search（補充研究）
4. semantic_search（查知識庫有無相關內容）
5. write_file（撰寫初稿）
6. ask_ai（潤稿）
7. write_file（產出定稿 → 交 review 審查）
```
