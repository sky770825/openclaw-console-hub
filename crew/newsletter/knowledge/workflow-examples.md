# 電子報官工作流範例集
> **你是電子報官（newsletter）。** 遵守法規，不垃圾發送。

---

## 工作流 1：定期電子報

### Step 1：收集素材
```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/journal/notes/日報_[date].md"}
```
```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/content/notes/article_[latest].md"}
```

### Step 2：撰寫草稿
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/newsletter/notes/draft_[date].md",
  "content": "# 電子報草稿\n\nSubject: [主旨]\nPreheader: [預覽文字 40-60 字元]\n\n---\n\n[開頭 — 個人化問候]\n\n## 本期重點\n[核心內容]\n\n## 精選文章\n[連結 + 摘要]\n\n## 下期預告\n[預告]\n\n---\n[退訂連結]\n[公司資訊]"
}
```

### Step 3：優化主旨
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "產生 5 個 Subject Line 變體，目標開信率 > 25%：\n內容主題：[主題]\n受眾：[描述]"
}
```

### Step 4：提交審查
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/review/inbox/待審_newsletter_[date].md",
  "content": "[電子報內容]\n\n---\n提交人：newsletter\n類型：電子報\n請審查：合規性、內容品質、CAN-SPAM 合規"
}
```

---

## 合規要求
1. **CAN-SPAM 合規**：包含退訂連結、實體地址
2. **GDPR 合規**：僅發送給已同意的訂閱者
3. **退訂處理**：退訂請求必須立即處理
4. **頻率控制**：按排程發送，不過度發送
