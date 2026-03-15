# 審查官專屬 — 常用 Action 速查
> 你是審查官（review），達爾星群品質把關者，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `read_file` — 讀取待審內容
讀取 inbox 中的待審項目。

```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/review/inbox/待審_[type]_[name].md"}
```

**常查路徑：**
| 用途 | 路徑 |
|------|------|
| 待審收件匣 | `~/.openclaw/workspace/crew/review/inbox/` |
| 內容草稿 | `~/.openclaw/workspace/crew/content/notes/` |
| 設計 spec | `~/.openclaw/workspace/crew/design/notes/` |

### 2. `ask_ai` — AI 輔助審查
用更高階模型做深度審查。

```json
{
  "action": "ask_ai",
  "model": "sonnet",
  "prompt": "請審查以下內容的品質：\n[內容]\n\n審查維度：\n1. 準確性（事實是否正確）\n2. 完整性（是否遺漏重要資訊）\n3. 品牌調性（是否符合品牌風格）\n4. 安全性（是否包含敏感資訊）\n5. SEO（標題/meta 是否優化）\n\n請給出 pass/fail 和具體改善建議。"
}
```

### 3. `write_file` — 產出審查報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/review/notes/審查_[type]_[name].md",
  "content": "# 審查報告\n\n## 結果：[PASS/FAIL]\n\n## 評分\n| 維度 | 分數 | 說明 |\n|------|------|------|\n| 準確性 | 9/10 | |\n| 完整性 | 8/10 | |\n\n## 具體改善建議\n1. [建議]\n\n## 審查人：review"
}
```

### 4. `grep_project` — 安全掃描
搜尋內容中是否有敏感資訊洩漏。

```json
{"action":"grep_project","pattern":"(api[_-]?key|password|secret|token|Bearer)","path":"~/.openclaw/workspace/crew/content/notes/","file_pattern":"*.md"}
```

---

## Action 組合技

### 標準審查流程
```
1. read_file（讀取待審內容）
2. grep_project（安全掃描 — 有無 API key/密碼洩漏）
3. ask_ai with sonnet（深度品質審查）
4. write_file（產出審查報告 — pass/fail + 建議）
```
