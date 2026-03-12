---
name: web_scout
version: 1.0.0
description: 網際網路偵察技能。支援 Google 搜尋、網頁內文抓取與語意分析。
category: reconnaissance
capabilities: [web_search, web_fetch, semantic_search]
---

# Web Scout Skill

當你需要獲取當前世界資訊、技術文件或驗證外部事實時，使用此技能。

## 核心指令 (Core Actions)

1. 搜尋: web_search(query, limit)
2. 抓取: web_fetch(url)
3. 內化: index_file(path)

## 執行邏輯 (Logic Flow)

- 先搜尋 (web_search) 獲取連結清單。
- 挑選最相關的 1-2 個 URL 進行抓取 (web_fetch)。
- 將抓取到的關鍵資訊寫入 notes/ 並進行索引 (index_file)。

## 邊界 (Boundaries)

- 禁止抓取需要登入的頁面。
- 禁止抓取超過 5000 字的超大型文件（會截斷）。
- 優先信任官方文件 (.io, .gov, .edu)。