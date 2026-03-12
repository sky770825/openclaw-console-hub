# OpenClaw_index_file

## 能力描述
將單一檔案即時寫入向量資料庫，確保新產出的知識能立刻被 semantic_search 找到。

## 輸入參數
- path: 檔案路徑 (必填)
- category: 知識分類 (可選，預設依路徑判斷)

## 執行規範
- 自動切片：系統會自動根據 ## 標題進行 chunking。
- 分類映射：如 notes/ 會自動歸類為 notes。

## 輸出預期
索引成功的 chunk 數量。