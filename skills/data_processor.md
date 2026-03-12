---
name: data_processor
version: 1.0.0
description: 資料分析與轉換技能。支援 JSON/CSV 處理、Supabase 查詢優化與報表生成。
category: data
capabilities: [query_supabase, code_eval, write_file]
---

# Data Processor Skill

## 目的
從多個數據源（Supabase, API, Logs）提取資訊並轉化為可決策的報表或 JSON 格式。

## 運作方式
1. 提取: 使用 query_supabase 抓取原始數據。
2. 轉換: 使用 code_eval 進行複雜的數據清洗與聚合。
3. 產出: 將結果寫入 notes/ 或直接在回覆中呈現結構化數據。

## 邊界
- 處理敏感個資時必須進行脫敏。
- Supabase 查詢 limit 預設不超過 100 筆以維護效能。
- 禁止執行任何 delete 或 truncate 指令。