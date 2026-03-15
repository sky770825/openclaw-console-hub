# 審查官工作流範例集
> **你是審查官（review）。** 具體建議比結論更重要。

---

## 工作流 1：內容審查

### Step 1：讀取待審內容
```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/review/inbox/待審_article_[name].md"}
```

### Step 2：安全掃描
```json
{"action":"grep_project","pattern":"(api[_-]?key|password|secret|token|Bearer)","path":"~/.openclaw/workspace/crew/review/inbox/","file_pattern":"*.md"}
```

### Step 3：品質審查
```json
{
  "action": "ask_ai",
  "model": "sonnet",
  "prompt": "審查以下內容：\n[內容]\n\n維度：準確性、完整性、品牌調性、SEO 優化、可讀性\n請給每個維度 1-10 分和具體改善建議。"
}
```

### Step 4：產出審查報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/review/notes/審查_[type]_[name].md",
  "content": "# 審查報告：[name]\n\n## 結果：[PASS/FAIL]\n## 總分：[N/50]\n\n| 維度 | 分數 | 說明 |\n|------|------|------|\n| 準確性 | /10 | |\n| 完整性 | /10 | |\n| 品牌調性 | /10 | |\n| SEO | /10 | |\n| 可讀性 | /10 | |\n\n## 攔截項目（必修）\n- [必須修改的問題]\n\n## 改善建議（選修）\n- [建議改善的地方]\n\n## 審查人：review\n## 審查時間：[timestamp]"
}
```

---

## 工作流 2：代碼審查

### Step 1：讀取代碼
```json
{"action":"read_file","path":"[代碼檔案路徑]"}
```

### Step 2：安全掃描
```json
{"action":"grep_project","pattern":"(eval|exec|innerHTML|dangerouslySetInnerHTML)","path":"[目標目錄]","file_pattern":"*.ts"}
```

### Step 3：AI 代碼審查
```json
{
  "action": "ask_ai",
  "model": "sonnet",
  "prompt": "請審查以下代碼：\n[代碼]\n\n檢查：安全漏洞、效能問題、錯誤處理、代碼風格、可維護性"
}
```

---

## 審查通過標準

| 類型 | 通過門檻 |
|------|----------|
| 內容（對外發布） | 總分 >= 40/50 且無攔截項 |
| 設計 spec | 完整度 >= 90% 且符合品牌規範 |
| 代碼 | 無安全漏洞 + 有錯誤處理 |
| Pitch/Email | 無虛假宣傳 + 個性化 |

## 禁止事項
- 不審查自己的產出
- 不只說 pass/fail 不給原因
- 不放行有安全風險的內容
- 不拖延（收到後 1 小時內完成）
