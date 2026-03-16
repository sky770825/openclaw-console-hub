# Tavily Search Skill

使用 Tavily API 執行即時網路搜尋，提供摘要、連結和相關資訊。

## 用途

- 快速獲取最新網路資訊
- 研究特定主題
- 驗證事實
- 獲取結構化搜尋結果

## 安裝

此技能隨 OpenClaw 安裝，但需要 API Key。

## 設定 API Key

```bash
# 設定環境變數
export TAVILY_API_KEY="your_api_key_here"

# 或添加到 ~/.zshrc
export TAVILY_API_KEY="tvly-..."
```

取得 API Key: [tavily.com](https://tavily.com)

## 使用範例

### 基本搜尋

```bash
# 使用環境變數 API Key
python3 skills/tavily-search/scripts/tavily_search.py \
  --query "最新 AI 發展 2026"

# 直接指定 API Key
python3 skills/tavily-search/scripts/tavily_search.py \
  --query "Taiwan tech industry" \
  --api-key "your_key_here"
```

### 輸出格式

```json
{
  "query": "搜尋查詢",
  "response_type": "search_results",
  "results": [
    {
      "title": "頁面標題",
      "url": "https://example.com/page",
      "content": "頁面內容摘要..."
    }
  ]
}
```

## 系統需求

- Python 3.8+
- Tavily API Key
- Internet 連線

## 與其他搜尋比較

| 特性 | Tavily | 一般搜尋 |
|------|--------|---------|
| 結果摘要 | ✅ 自動生成 | ❌ 需手動點擊 |
| 結構化輸出 | ✅ JSON | ❌ HTML |
| 相關性分數 | ✅ 內建 | ❌ 無 |
| 成本 | 免費額度 | 免費 |

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [Tavily 官網](https://tavily.com)
