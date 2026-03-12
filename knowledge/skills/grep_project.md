# OpenClaw_grep_project

## 能力描述
在整個專案目錄中搜尋特定字串或正則表達式，用於追蹤函數用法或查找 TODO。

## 輸入參數
- pattern: 搜尋樣式 (必填)
- include/exclude: 檔案過濾規則

## 執行規範
- 效能優化：利用 ripgrep 或高效能搜尋演算法。
- 雜訊過濾：自動忽略 node_modules 和 .git。

## 輸出預期
匹配行清單，含檔名、行號與內容。