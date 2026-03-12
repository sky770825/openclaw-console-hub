# GitHub Issue Classifier Skill 🤖

自動讀取 GitHub Issue，使用 AI 分析內容，自動標記標籤，並發送通知。

## 功能

✅ 讀取最近的 GitHub Issues  
✅ 使用 Ollama AI 分析內容並分類  
✅ 自動標記標籤（支援現有標籤）  
✅ 發送 Telegram 通知  

## 分類維度

| 維度 | 選項 |
|------|------|
| **類別** | bug, feature, docs, question, performance, security |
| **優先級** | low, medium, high, critical |
| **標籤** | 根據倉庫現有標籤自動匹配 |

## 快速開始

### 1. 安裝

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env
```

需要的設定：
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `GITHUB_REPO` - 倉庫 URL (如 https://github.com/owner/repo)

### 3. 運行

```bash
# 開發模式
npm run dev

# 編譯後運行
npm run build
npm start
```

## 運作流程

```
讀取 Issues → AI 分析 → 分類決策 → 標記標籤 → Telegram 通知
```

## 標籤策略

只會套用**倉庫已存在的標籤**，不會創建新標籤。建議先在 GitHub 上建立這些標籤：

- `bug`, `feature`, `docs`, `question`
- `priority:low`, `priority:medium`, `priority:high`
- `needs-triage`

## 定時執行

每 30 分鐘檢查一次新 Issues：

```bash
*/30 * * * * cd /path/to/github-issue-classifier-skill && npm start >> logs/cron.log 2>&1
```

## 輸出示例

```
🚀 GitHub Issue Classifier started...
📁 Repository: myorg/myproject
📋 Found 5 recent issues

🔍 Processing Issue #42: 登入功能無法使用
  📊 Category: bug
  🔥 Priority: high
  🏷️ Suggested labels: bug, priority:high
  ✅ Applied labels to #42: bug, priority:high
  ✅ Telegram notification sent
```

## 技術棧

- TypeScript / Node.js
- GitHub REST API (@octokit/rest)
- Ollama 本地 AI (qwen3:8b)
- Telegram Bot API

## License

MIT
