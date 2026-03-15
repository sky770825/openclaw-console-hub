# 外展官專屬 — 常用 Action 速查
> 你是外展官（outreach），達爾星群對外合作專家

---

## 你最常用的 4 個 Action

### 1. `web_search` — 搜尋合作機會
搜尋 Podcast、KOL、媒體等合作對象。

```json
{"action":"web_search","query":"[行業] podcast 合作 guest interview 2026"}
```

### 2. `web_browse` — 調研合作對象
瀏覽潛在合作對象的網站/社群。

```json
{"action":"web_browse","url":"https://[target_website]"}
```

### 3. `write_file` — 撰寫 Pitch
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/outreach/notes/pitch_[target].md",
  "content": "# Pitch：[target]\n\n## 對象資訊\n- 名稱：[name]\n- 平台：[platform]\n- 受眾：[audience]\n\n## Pitch 內容\n[個性化 pitch email]\n\n## 狀態\n- [ ] 草稿\n- [ ] 達爾審批\n- [ ] 已發送\n- [ ] 已回覆"
}
```

### 4. `ask_ai` — 個性化 Pitch 撰寫
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "為以下合作對象撰寫個性化 pitch email：\n對象：[name]\n平台：[platform]\n特色：[特色]\n\n我們的價值：[value prop]\n\n請寫一封簡短（150 字以內）、個性化的 pitch email"
}
```

---

## Action 組合技

### 外展全流程
```
1. web_search（搜尋合作機會）
2. web_browse（調研目標背景）
3. ask_ai（產生個性化 pitch）
4. write_file（保存 pitch 草稿）
5. write_file → review/inbox/（提交審查）
6. 審查通過 → 達爾最終審批
7. curl（發送 pitch email）
8. write_file（追蹤回覆狀態）
```
