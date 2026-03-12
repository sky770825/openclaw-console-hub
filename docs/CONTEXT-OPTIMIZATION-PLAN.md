# Context 優化完整方案

**日期**: 2026-02-13  
**問題**: Context 高達 108k/131k (82%)  
**目標**: 降低 System Prompt + 對話歷史佔用

---

## 🔍 根因分析

### 108k Token 分佈估算

| 來源 | 估算大小 | 百分比 | 說明 |
|------|----------|--------|------|
| **工具定義** | ~25-30k | 23-28% | 20+ 工具詳細 schema |
| **Skills (21個)** | ~15-20k | 14-18% | 每個 SKILL.md ~5KB |
| **對話歷史** | ~50-60k | 46-55% | 累積多輪對話 |
| **Project Context** | ~1.3k | 1% | AGENTS.md 等 |
| **System Base** | ~5-8k | 5-7% | OpenClaw 基礎提示 |

**關鍵發現**: Skills 載入是隱藏大戶！21個 ready skills，每個都注入 SKILL.md。

---

## ⚡ 立即行動（今晚可做）

### 1. 禁用非必要 Skills（預計節省 10-15k tokens）

```bash
# 查看目前載入的 skills
openclaw skills list

# 禁用不常用的（保留核心 6-8 個）
openclaw skills disable apple-notes
openclaw skills disable apple-reminders
openclaw skills disable things-mac
openclaw skills disable himalaya
openclaw skills disable imsg
openclaw skills disable tmux
openclaw skills disable video-frames
openclaw skills disable weather
openclaw skills disable openai-image-gen
openclaw skills disable openai-whisper-api
```

**建議保留的核心 Skills（6個）**:
- `healthcheck` - 安全檢查
- `playwright-scraper-skill` - 網頁抓取
- `screen-vision` - 螢幕 OCR
- `session-logs` - 日誌分析
- `github` - GitHub 操作
- `tavily-search` - 搜尋

### 2. 開新會話清除歷史（預計節省 50-60k tokens）

```
/new
```

這會立即清除對話歷史，context 降到 ~50k。

---

## 🔧 中期優化（本週配置調整）

### 3. Gateway 配置優化

編輯 `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "kimi/kimi-k2.5"
      },
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "maxHistoryShare": 0.5
      },
      "subagents": {
        "maxConcurrent": 3
      }
    }
  },
  "skills": {
    "enabled": [
      "healthcheck",
      "playwright-scraper-skill",
      "screen-vision",
      "session-logs",
      "github",
      "tavily-search"
    ],
    "disabled": [
      "apple-notes",
      "apple-reminders",
      "things-mac",
      "himalaya",
      "imsg",
      "tmux",
      "video-frames",
      "weather",
      "openai-image-gen",
      "openai-whisper-api",
      "gog"
    ]
  }
}
```

**關鍵參數**:
- `maxHistoryShare: 0.5` - 對話歷史最多占 50% context
- `reserveTokensFloor: 20000` - 保留 20k 給輸出

### 4. 自動 Context 管理腳本

建立 `scripts/context-manager.sh`:

```bash
#!/bin/bash
# Context 管理腳本

THRESHOLD=70
CURRENT=$(openclaw status 2>/dev/null | grep -o "Context: [0-9]*" | awk '{print $2}')

echo "Current Context: ${CURRENT}%"

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    echo "⚠️ Context 超過 ${THRESHOLD}%，建議執行:"
    echo "   1. /checkpoint - 建立檢查點"
    echo "   2. /new - 開新會話"
    echo "   3. 清理舊 logs: ./scripts/cleanup-logs.sh"
fi
```

---

## 🏗️ 長期架構改進

### 5. 對話歷史自動摘要機制

```javascript
// 建議新增到 OpenClaw 核心
class ConversationSummarizer {
  async compactHistory(session, threshold = 0.7) {
    const usage = await session.getContextUsage();
    
    if (usage > threshold) {
      // 摘要舊對話
      const summary = await llm.summarize(
        session.messages.slice(0, -5) // 保留最近 5 輪
      );
      
      // 替換為摘要
      session.messages = [
        { role: 'system', content: `Previous conversation: ${summary}` },
        ...session.messages.slice(-5)
      ];
    }
  }
}
```

### 6. Skills 延遲載入 (Lazy Loading)

建議改進：不是開場就載入所有 21 個 skills，而是：

```javascript
// 按需載入
async function loadSkill(skillName, userIntent) {
  const skill = await skills.match(userIntent);
  if (skill) {
    return await skill.load(); // 動態載入 SKILL.md
  }
}
```

### 7. 工具定義壓縮

簡化 tool schema，移除冗餘描述：

```yaml
# 目前（冗長）
web_search:
  description: "Search the web using Brave Search API. Supports region-specific 
    and localized search via country and language parameters. Returns titles, 
    URLs, and snippets for fast research."
  
# 建議（精簡）
web_search:
  description: "Web search via Brave API. Returns titles/URLs/snippets."
```

---

## 📊 優化效果預估

| 優化項目 | Token 節省 | 實施難度 | 優先級 |
|----------|-----------|----------|--------|
| 禁用 skills (15個) | -10k ~ -15k | ⭐ 簡單 | P0 |
| 開新會話 `/new` | -50k ~ -60k | ⭐ 簡單 | P0 |
| maxHistoryShare 0.5 | -10k ~ -15k | ⭐⭐ 中等 | P1 |
| 對話自動摘要 | -20k ~ -30k | ⭐⭐⭐ 複雜 | P2 |
| Skills 延遲載入 | -15k ~ -20k | ⭐⭐⭐ 複雜 | P2 |
| 工具定義壓縮 | -5k ~ -10k | ⭐⭐ 中等 | P3 |

**預期效果**: 從 108k → 30-40k (減少 60-70%)

---

## 🚀 立即執行指令

```bash
# 1. 查看當前 skills
openclaw skills list

# 2. 禁用非核心 skills（複製貼上）
openclaw skills disable apple-notes
openclaw skills disable apple-reminders  
openclaw skills disable things-mac
openclaw skills disable himalaya
openclaw skills disable imsg
openclaw skills disable tmux
openclaw skills disable video-frames
openclaw skills disable weather
openclaw skills disable openai-image-gen
openclaw skills disable openai-whisper-api

# 3. 重啟 gateway 生效
openclaw gateway restart

# 4. 開新會話測試
# 在 OpenClaw 聊天中輸入: /new
```

---

## 🎯 持續監控

建立 `~/.openclaw/context-watch.sh`:

```bash
#!/bin/bash
# 每 10 分鐘檢查一次

STATUS=$(openclaw status 2>/dev/null)
CONTEXT=$(echo "$STATUS" | grep -o "Context: [0-9]*k/[0-9]*k")
PERCENT=$(echo "$STATUS" | grep -oP '\d+(?=%)')

echo "[$(date)] $CONTEXT"

if [ "$PERCENT" -gt 80 ]; then
    echo "🚨 Context 超標！執行 checkpoint..."
    # 發送通知（如有 Telegram bot）
fi
```

加到 crontab:
```bash
*/10 * * * * ~/.openclaw/context-watch.sh >> ~/.openclaw/logs/context.log 2>&1
```

---

## 📋 檢查清單

- [ ] 禁用非必要 skills（目標：6-8 個）
- [ ] `/new` 開新會話測試
- [ ] 調整 `maxHistoryShare` 到 0.5
- [ ] 設定 `reserveTokensFloor` 到 20000
- [ ] 建立 context 監控腳本
- [ ] 達 70% 自動提醒機制
- [ ] 測量優化前後 token 使用量

---

**結論**: 
最大的兩個優化點是 **(1) 減少載入的 skills** 和 **(2) 定期開新會話**。  
這兩個動作今晚就能做，預計可減少 60-70k tokens，讓 context 降到 ~40k。
