# QMD Search Skill

高效搜尋 Markdown 知識庫的本地工具，使用 BM25 + 向量嵌入實現快速精準的內容檢索。

## 用途

- 在 Obsidian Vault 或 Markdown 集合中快速搜尋
- 僅返回相關片段而非完整檔案（節省 96% Token）
- 本地索引，隱私安全
- 支援關鍵字搜尋與語義搜尋

## 安裝

```bash
# 安裝 qmd
bun install -g https://github.com/tobi/qmd

# 添加集合（例如 Obsidian Vault）
qmd collection add ~/path/to/vault --name notes

# 生成向量嵌入（語義搜尋需要）
qmd embed --collection notes
```

## 使用範例

```bash
# 關鍵字搜尋（BM25）
qmd search "api authentication" --collection notes

# 語義搜尋
qmd vsearch "how to handle errors gracefully" --collection notes

# 混合搜尋
qmd hybrid "database optimization" --collection notes

# 查看所有集合
qmd collection list
```

## 輸出格式

```json
{
  "results": [
    {
      "file": "path/to/file.md",
      "score": 0.95,
      "snippet": "相關內容片段...",
      "line": 42
    }
  ]
}
```

## 最佳實踐

- **BM25**：用於特定術語、名稱、技術關鍵字
- **語義搜尋**：用於概念查詢（措詞可能不同）
- 定期執行 `qmd embed` 更新向量索引

## 系統需求

- Node.js / Bun
- 足夠磁碟空間存放索引

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [qmd 專案](https://github.com/tobi/qmd)
