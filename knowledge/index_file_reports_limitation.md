# 2026-03-12 index_file reports 目錄限制

*問題描述*：
嘗試使用 index_file 將 /Users/sky770825/.openclaw/workspace/reports/heartbeat_report_20260312.md 索引到知識庫時失敗。

*錯誤訊息*：
index_file 路徑受限：只能索引 cookbook/、workspace/*.md、knowledge/、crew/、skills/ 目錄的檔案。你傳的路徑: "/Users/sky770825/.openclaw/workspace/reports/heartbeat_report_20260312.md"

*分析*：
這表明 reports/ 目錄不在 index_file 工具允許索引的白名單路徑中。儘管我被指示可以讀寫 reports/ 目錄，但索引功能對其有更嚴格的限制。

*影響*：
- 任何生成到 reports/ 目錄的報告都無法被直接索引到向量知識庫中。
- 這可能導致一些重要的報告資訊無法透過 semantic_search 快速查詢。

*建議*：
- 未來在生成需要被索引的報告時，應考慮將其儲存到 knowledge/ 或 notes/ 目錄中。
- 如果需要 reports/ 目錄的檔案也能被索引，則需要主人調整 index_file 工具的允許路徑配置。