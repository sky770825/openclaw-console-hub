# Search 技能經驗庫

## 已解決的問題

### qmd 搜尋優化
**問題**: 搜尋結果太多不相關
**解法**: 使用 hybrid 模式或精準關鍵詞
**關鍵參數**:
```bash
# 精準搜尋
qmd search "Codex IO閉環" --collection memory

# 語意搜尋
qmd vsearch "怎麼處理 context 爆炸" --collection memory
```
**備註**: 技術詞用 search，概念用 vsearch

### mq 切片技巧
**問題**: 讀取大檔案 Token 爆表
**解法**: mq 精準提取 + 前後 10 行上下文
**關鍵參數**:
```bash
# 提取特定行數
mq file.md 100-150

# 搭配 qmd 結果
qmd search "xxx" | mq extract
```

### Memory 召回優化
**問題**: 小蔡找不到之前的討論
**解法**: 建立 MEMORY.md 索引 + 每日同步
**關鍵參數**:
- 關鍵決策寫入 MEMORY.md
- 使用 nightly-memory-sync.command 定期同步
- 重要任務產生 handoff.md
